import dotenv from 'dotenv'
dotenv.config()
import Fastify, { FastifyInstance } from 'fastify'
import FastifySession from '@fastify/session'
import FastifyCookie from '@fastify/cookie'
import fastifyWebsocket from '@fastify/websocket'
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
import { FastifyPluginOptions } from 'fastify';
import { CustomFastifySession } from '../../common-types/User.js'
import User from './modules/users/User.js';
import ConfigManager from './modules/ConfigManager.js';

import FastifyHelmet from '@fastify/helmet'
import DiscussionManager from './modules/DiscussionManager.js';
import SetCacheManager from './modules/SetCache.js'

const __dirname = dirname(fileURLToPath(import.meta.url));

const MySQLStore = MySQLSession(FastifySession )

const envToLogger = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
    level: process.env.FASTIFY_DEBUG_LEVEL || 'debug'
  },
  production: {
    level: process.env.FASTIFY_DEBUG_LEVEL || 'warn'
  },
  test: false,
}
const app = Fastify({
    pluginTimeout: 20000,
    trustProxy: process.env.NODE_ENV === "production",
    logger: envToLogger[process.env.NODE_ENV ?? "development"]
})
async function onSignal(signal: NodeJS.Signals) {
    console.log("GOT SIGNAL", signal, "-- SHUTTING DOWN")
    app.servers?.onShutdown()
    await SetCacheManager.Save()
    app.close()
    setTimeout(() => {
        process.exit(0)
    }, 1000)
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
    }
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

app.register(
    FastifyHelmet,
)
app.register(fastifyWebsocket)
  

import MiddleManager from './middlewares/managers.js'
app.register(MiddleManager)
.then(async() => {
    app.register(FastifyCookie)
    app.register(FastifySession, { 
        secret: process.env.SESSION_SECRET,
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
                const [,name,ext] = dirent.name.match(/^(.+)\.(.+)$/)
                if(ext === "js" || ext === "ts") {
                    const prefix = (name === "index") ? rootPrefix : `${rootPrefix}${name}`
                    try {
                        app.register(import(`file://${path.join(folderPath, dirent.name)}`), { prefix })
                    } catch(err) {
                        app.log.fatal(`Could not load route ${name}. prefix=${prefix}\n${err.stack}`)
                        process.exit(1)
                    }
                }
            }
        }

    }
    await loadRoutes(mainPrefix, path.join(__dirname, './routes'))
    try {
        await app.listen({
            port: Number(process.env.WEB_PORT) || 8081
        })
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }      
})