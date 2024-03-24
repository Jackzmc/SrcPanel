import Fastify, { FastifyInstance } from 'fastify'
import FastifySession from '@fastify/session'
import FastifyCookie from '@fastify/cookie'
import MySQLSession from 'express-mysql-session'
import { Pool } from 'mysql2/promise';
import dotenv from 'dotenv'
import SteamAPI from './modules/steam.js'
import AuthManager from './modules/auth/AuthManager.js';
import ServerManager from './modules/servers/ServerManager.js';
import UserManager from './modules/users/UserManager.js';
import { readdir } from 'fs/promises';
import path from 'path'
import cors from '@fastify/cors'
dotenv.config()

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FastifyPluginOptions } from 'fastify';
import { CustomFastifySession } from '../../common-types/User.js'
import User from './modules/users/User.js';
import ConfigManager from './modules/ConfigManager.js';
import FastifySwagger from '@fastify/swagger'
import { UserPrivilegeCode } from '../../common-types/Privileges.js';

import FastifyHelmet from '@fastify/helmet'
import { QueryQueue } from './modules/QueryQueue.js';
import DiscussionManager from './modules/DiscussionManager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MySQLStore = MySQLSession(FastifySession )

const app = Fastify({
    pluginTimeout: 20000,
    trustProxy: process.env.NODE_ENV === "production",
    logger: {
        transport: process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                }
            } : undefined,
        level: process.env.FASTIFY_DEBUG_LEVEL || 
            (process.env.NODE_ENV !== "production" ? 'debug' : 'error')
      }
})
async function onSignal(signal: NodeJS.Signals) {
    console.log("GOT SIGNAL", signal, "-- SHUTTING DOWN")
    app.servers?.onShutdown()
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
    jobs: QueryQueue,
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

    await setupSwagger()

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
                if(ext === "js") {
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

    await loadRoutes(mainPrefix, path.join(__dirname, 'routes'))

    try {
        await app.listen({
            port: Number(process.env.WEB_PORT) || 8081
        })
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }      
})

async function setupSwagger() {
    await app.register(FastifySwagger, {
        routePrefix: '/api-docs',
        swagger: {
          info: {
            title: 'Test swagger',
            description: 'Testing the Fastify swagger API',
            version: '0.1.0'
          },
          externalDocs: {
            url: 'https://swagger.io',
            description: 'Find more info here'
          },
          host: 'localhost',
          schemes: ['http'],
          consumes: ['application/json'],
          produces: ['application/json'],
          definitions: {
            steamid: {
                type: 'string',
            }
          },
          securityDefinitions: {
            apiKey: {
              type: 'apiKey',
              name: 'X-APIKEY',
              in: 'header'
            }
          },
        },
        exposeRoute: true,
        hideUntagged: false,
        uiConfig: {
          docExpansion: 'full',
          deepLinking: false
        },
        uiHooks: {
          onRequest: function (request, reply, next) { next() },
          preHandler: function (request, reply, next) { next() }
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
    })
} 
