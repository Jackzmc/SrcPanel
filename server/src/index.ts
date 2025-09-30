import 'dotenv/config'
import Fastify, { FastifyInstance } from 'fastify'
import FastifySession from '@fastify/session'
import FastifyCookie from '@fastify/cookie'
import fastifyWebsocket from '@fastify/websocket'
import FastifyEtag from '@fastify/etag'
import MySQLSession from 'express-mysql-session'
import { Pool } from 'mysql2/promise';
import SteamAPI from './modules/steam.js'
import AuthManager from './modules/auth/AuthManager.js';
import ServerManager from './modules/servers/ServerManager.js';
import UserManager from './modules/users/UserManager.js';
import { readdir } from 'fs/promises';
import path from 'path'
import cors from '@fastify/cors'

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fastify, { FastifyPluginOptions } from 'fastify';
import { CustomFastifySession } from '../../common-types/User.js'
import User from './modules/users/User.js';
import ConfigManager from './modules/ConfigManager.js';

import FastifyHelmet from '@fastify/helmet'
import DiscussionManager from './modules/DiscussionManager.js';
import SetCacheManager from './modules/SetCache.js'
import TaskManager from './modules/tasks/TaskManager.js'

const __dirname = dirname(fileURLToPath(import.meta.url));

const MySQLStore = MySQLSession(FastifySession )

import loggerInstance from './logger.js'
const app = Fastify({
    pluginTimeout: 20000,
    trustProxy: process.env.NODE_ENV === "production",
    loggerInstance
})

process.on('unhandledRejection', (reason: any, promise ) => {
  app.log.fatal('Unhandled promise rejection:\n' + reason.stack);
});
// app.log.trace("trace")
// app.log.debug("debug")
// app.log.info("info")
// app.log.warn("warn")
// app.log.error("error")
// app.log.fatal("fatal")
let hadSignal = false, ready = false
async function onSignal(signal: NodeJS.Signals) {
    // If already had a SIGTERM, just shut down instantly
    if(hadSignal || !ready) {
        process.exit(0)
        return
    }
    hadSignal = true
    app.log.info(`GOT SIGNAL ${signal} -- SHUTTING DOWN`)
    setTimeout(() => {
        app.log.error("Timed out, forcing shutdown")
        process.exit(0)
    }, 20_000)
    await app.servers?.onShutdown()
    await SetCacheManager.Save()
    app.log.info("Closing fastify")
    await app.close()
}
["SIGUSR2", "SIGINT", "SIGTERM"].map((signal) => {
    process.on(signal, onSignal)
})

declare module 'fastify' {
  export interface FastifyInstance {
    db: Pool;
    steam: SteamAPI,
    authmngr: AuthManager,
    servers: ServerManager,
    users: UserManager,
    config: ConfigManager,
    managers: {
      discussions: DiscussionManager
    },
    jobs: TaskManager
  }
  export interface FastifyRequest {
    user?: User,
  }
  // I dont know how to do this properly, its a fucking pain
  interface Session extends CustomFastifySession {}
}


const CORS_WHITELIST = process.env.CORS_WHITELIST ? process.env.CORS_WHITELIST.split(",") : ["localhost:8080"] 
app.register(cors, {
    origin: CORS_WHITELIST,
    methods: ["GET","POST","PATCH","UPDATE","DELETE"]
})
app.register(FastifyHelmet)
app.register(FastifyEtag)
app.register(fastifyWebsocket)

import MiddleManager from './middlewares/managers.js'
import { DiscordBot } from './modules/DiscordBot.js'
import { sleep } from './util.js'
app.register(MiddleManager)
.then(async() => {
    if(hadSignal) return
    if(process.env.DISCORD_API_TOKEN) {
        const bot = new DiscordBot(app.servers, "data/server_voice_map.json", process.env.DISCORD_API_TOKEN as string)
        await bot.init()
    }

    app.register(import('@fastify/rate-limit'), { 
        global: true,
    })

    app.register(FastifyCookie, {
        secret: process.env.SESSION_SECRET as string,
    })
    app.register(FastifySession, { 
        secret: process.env.SESSION_SECRET as string,
        cookieName: 'srcds-sessid',
        cookie: { 
            secure: process.env.NODE_ENV === "production", 
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: 1.21e+9,
            httpOnly: true
        },
        store: new MySQLStore({
            schema: {
                tableName: 'dash_sessions',
            }
        }, app.db),
        saveUninitialized: false
    })

    app.addHook('preHandler', (request, reply, next) => {
        if(request.headers.origin && CORS_WHITELIST.includes(request.headers.origin)) {
            reply.header("Access-Control-Allow-Origin", request.headers.origin)
        }
        return next()
    })


    const mainPrefix = `/api/`

    async function loadRoutes(rootPrefix: string = "/", folderPath: string) {
        const dirents = await readdir(folderPath, { withFileTypes: true })

        for(const dirent of dirents) {
            if(dirent.isDirectory()) {
                let prefix: string;
                if(dirent.name[0] === "!") {
                    prefix = rootPrefix
                    if(dirent.name[1] === "!") {
                        app.register(async(fastify: FastifyInstance, opts: FastifyPluginOptions) => {
                            fastify.addHook('preHandler', async(req, reply) => {
                                await fastify.authmngr.verify(req, reply)
                            })
                            await loadRoutes(prefix, path.join(folderPath, dirent.name))
                        })
                        continue
                    }
                } else {
                    prefix =  `${rootPrefix}${dirent.name}/`
                }

                await loadRoutes(prefix, path.join(folderPath, dirent.name))
                
            } else if(dirent.isFile()) {
                const match = dirent.name.match(/^(.+)\.(.+)$/)
                if(!match) return
                const [,name,ext] = match
                if(ext === "js" || ext === "ts") {
                    const prefix = (name === "index") ? rootPrefix : `${rootPrefix}${name}`
                    try {
                        await app.register(import(`file://${path.join(folderPath, dirent.name)}`), { prefix })
                    } catch(err) {
                        app.log.fatal(`Could not load route ${name}. prefix=${prefix}\n${err.stack}`)
                        process.exit(1)
                    }
                }
            }
        }

    }
    if(hadSignal) return

    await loadRoutes(mainPrefix, path.join(__dirname, './routes'))

    await setupNotFound(app)
    try {
        await app.listen({
            host: process.env.LISTEN_HOST,
            port: Number(process.env.LISTEN_PORT) || 8081
        })
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }      
    ready = true
})

async function setupNotFound(app: FastifyInstance) {
    // HACK: app.rateLimit isn't defined until a period of time (usually 1-3ms)
    // Despite the github issue about it needing to be await'd, it still occurs
    const TIMEOUT = 1000
    const time = Date.now()
    while(!app.rateLimit || Date.now() - time > TIMEOUT) {
        await sleep(10)
    }

    // If exceed timeout, just let it crash from the error, just in case it magically worked anyway
    app.setNotFoundHandler({
        // @ts-expect-error not setting a handler function still works - but TS types complain
        preHandler: app.rateLimit({
            max: 4,
            timeWindow: 500
        })
    })
}