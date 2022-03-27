import Fastify, { FastifyInstance } from 'fastify'
import FastifySession from '@fastify/session'
import FastifyCookie from 'fastify-cookie'
import MySQLSession from 'express-mysql-session'
import { Pool } from 'mysql2/promise';
import dotenv from 'dotenv'
import { RedisClientType } from '@node-redis/client';
import SteamAPI from './modules/steam.js'
import AuthManager, { AdminPermissions } from './modules/AuthManager';
import ServerManager from './modules/ServerManager.js';
import { readdir } from 'fs/promises';
import path from 'path'
dotenv.config()

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FastifyPluginOptions } from 'fastify';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MySQLStore = MySQLSession(FastifySession)

const app = Fastify({
    trustProxy: process.env.NODE_ENV === "production",
    logger: {
        prettyPrint:
            process.env.NODE_ENV !== 'production'
            ? {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname'
              }
            : false,
        level: process.env.FASTIFY_DEBUG_LEVEL || 
            (process.env.NODE_ENV !== "production" ? 'debug' : 'error')
      }
})

declare module 'fastify' {
  export interface FastifyInstance {
    db: Pool;
    cache: RedisClientType,
    steam: SteamAPI,
    authmngr: AuthManager,
    servers: ServerManager
  }
  interface Session {
    user: {
      steamid: string,
      accountid: string,
      name:  string,
      profileurl: string,
      avatarhash: string,
    },
    permissions: AdminPermissions
    ip: string,
    loginTime: number,
    countryCode: string
  }
}

app.register(import('./middlewares/database.js'))
.then(async() => {
    app.register(FastifyCookie)
    app.register(FastifySession, { 
        secret: process.env.SESSION_SECRET,
        cookieName: 'srcds-sessid',
        cookie: { secure: process.env.NODE_ENV === "production" },
        store: new MySQLStore({
          schema: {
              tableName: 'dash_sessions',
          }
        }, app.db),
        saveUninitialized: false
    })


    const CORS_WHITELIST = process.env.CORS_WHITELIST ? process.env.CORS_WHITELIST.split(",") : [] 

    app.addHook('preHandler', (request, reply, next) => {
        if(!request.headers.origin || CORS_WHITELIST.includes(request.headers.origin)) {
            reply.header("Access-Control-Allow-Origin", request.headers.origin || "*")
        }
        return next()
    })

    app.addContentTypeParser('application/json', 
        { parseAs: 'string' }, 
        function (req, body, done) {
            try {
                const json = JSON.parse(body.toString())
                done(null, json)
            } catch (err) {
                err.statusCode = 400
                done(err, undefined)
            }
        }
    )

    app.register(import('./middlewares/redisCache.js'))
    app.register(import('./middlewares/steam.js'))


    const mainPrefix = `/api/`

    async function loadRoutes(rootPrefix: string = "/", folderPath?: string) {
        if(!folderPath) folderPath = path.join(__dirname, 'routes')
        const dirents = await readdir(folderPath, { withFileTypes: true })

        for(const dirent of dirents) {
            if(dirent.isDirectory()) {
                let prefix: string;
                let requiresAuth = false
                if(dirent.name[0] === "!") {
                    prefix = rootPrefix
                    if(dirent.name[1] === "!") {
                        requiresAuth = true
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

    loadRoutes(mainPrefix, path.join(__dirname, 'routes'))

    try {
        await app.listen(process.env.WEB_PORT || 8081)
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
})

