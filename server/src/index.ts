import Fastify from 'fastify'
import FastifySession from '@fastify/session'
import FastifyCookie from 'fastify-cookie'
import MySQLSession from 'express-mysql-session'
import { Pool } from 'mysql2/promise';
import dotenv from 'dotenv'
import { RedisClientType } from '@node-redis/client';
import SteamAPI from './modules/steam.js'
import AuthManager, { AdminPermissions } from './modules/AuthManager';
dotenv.config()

const MySQLStore = MySQLSession(FastifySession)

const app = Fastify({
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
    authmngr: AuthManager
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
.then(() => {
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

    app.register(import('./routes/auth/index.js'), { prefix: '/api/auth' })
    app.register(import('./routes/auth/steam.js'), { prefix: '/api/auth/steam' })
        
    app.register(import('./routes/privileged/bans.js'), { prefix: '/api/admin/bans/' })
    app.register(import('./routes/privileged/notes.js'), { prefix: '/api/notes/' })
    app.register(import('./routes/privileged/logs.js'), { prefix: '/api/logs/' })
    app.register(import('./routes/privileged/admins.js'), { prefix: '/api/admins/' })

    app.register(import('./routes/unprivileged/bans.js'), { prefix: '/api/bans' })
    app.register(import('./routes/unprivileged/notes.js'), { prefix: '/api/notes' })
    app.register(import('./routes/unprivileged/admins.js'), { prefix: '/api/admins' })

    const start = async () => {
        try {
        await app.listen(process.env.WEB_PORT || 8081)
        } catch (err) {
        app.log.error(err)
        process.exit(1)
        }
    }
    start()
})

