import 'dotenv/config'
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import FastifyCookie from '@fastify/cookie'
import FastifySession from '@fastify/session'
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
import fastifyUrlData from '@fastify/url-data'

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fastify, { FastifyPluginOptions } from 'fastify';
import { CustomFastifySession } from '@srcpanel/common/User'
import User from './modules/users/User.js';
import ConfigManager from './modules/ConfigManager.js';

import FastifyHelmet from '@fastify/helmet'
import DiscussionManager from './modules/DiscussionManager.js';
import TaskManager from './modules/tasks/TaskManager.js'
import CacheManager from './modules/CacheManager.js'

import MiddleManager, { TABLE_PREFIX } from './middlewares/managers.js'
import { FluxerBot } from './modules/FluxerBot.js'
import { sleep } from './util.js'
import { DataManagerInstance } from './modules/DataManager.js'
import { getGlobalWriter, sendMetric } from './modules/metrics/influx.js'

import './sentry.js'

const START_TIME = performance.now()
const FORCE_SHUTDOWN_TIMEOUT = 20_000

const __dirname = dirname(fileURLToPath(import.meta.url));

const MySQLStore = MySQLSession(FastifySession)

import loggerInstance from './logger.js'
const app = Fastify({
  pluginTimeout: 20000,
  trustProxy: process.env.NODE_ENV === "production",
  loggerInstance
})
import * as Sentry from '@sentry/node' 
Sentry.setupFastifyErrorHandler(app);

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
  if (hadSignal || !ready) {
    process.exit(0)
    return
  }
  hadSignal = true
  
  app.log.info(`SIGNAL ${signal} -- SHUTTING DOWN`)
  setTimeout(() => {
    app.log.error("Timed out, forcing shutdown")
    process.exit(1)
  }, FORCE_SHUTDOWN_TIMEOUT)
  // Handle shutdown logic
  app.log.trace('calling shutdown handlers')
  await Promise.allSettled([
    await app.servers?.onShutdown(),
    // flush & close influxdb global writer
    (async() => {
      const writer = getGlobalWriter()
      if(writer) await writer.close()
    })
  ])
  app.log.trace("closing fastify")
  await app.close()
  app.log.trace('flushing sentry logs')
  await Sentry.close(2000)
  process.exit(0)


}
["SIGUSR2", "SIGINT", "SIGTERM"].map((signal) => {
  process.on(signal, onSignal)
})

declare module 'fastify' {
  export interface FastifyInstance {
    db: Pool;
    data: DataManagerInstance,
    steam: SteamAPI,
    authmngr: AuthManager,
    servers: ServerManager,
    users: UserManager,
    config: ConfigManager,
    managers: {
      discussions: DiscussionManager
    },
    jobs: TaskManager,
    paths: {
      config: string,
      data: string,
      cache: string
    },
    cache: CacheManager
  }
  export interface FastifyRequest {
    user?: User,
  }
  // I dont know how to do this properly, its a fucking pain
  // eslint-disable-next-line -- this works for typescript
  interface Session extends CustomFastifySession { }
}


const CORS_WHITELIST = process.env.CORS_WHITELIST ? process.env.CORS_WHITELIST.split(",") : ["localhost:8080"]
app.register(cors, {
  origin: CORS_WHITELIST,
  methods: ["GET", "POST", "PATCH", "UPDATE", "DELETE"]
})
app.register(FastifyHelmet, {
  // TODO: proper impl
  contentSecurityPolicy: false
})
app.register(FastifyEtag)
app.register(fastifyWebsocket)
app.register(fastifyUrlData)

import internalMetrics from './hooks/metrics.js'
app.register(internalMetrics)

app.setErrorHandler((error, request, reply) => {
  app.log.error(error)
  Sentry.captureException(error);
  return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error has occurred' });
});


app.register(MiddleManager)
  .then(async () => {
    scheduleActivityLogPartition(app as unknown as FastifyInstance);
    // Is this going to be a race condition?
    addPartitionForYear(app as unknown as FastifyInstance, new Date().getFullYear())

    if  (hadSignal) return
    if  (process.env.FLUXER_API_TOKEN) {
      try {
      const bot = new FluxerBot(app.servers, app.cache, process.env.FLUXER_API_TOKEN as string)
      await bot.init()
      } catch (err) {
        app.log.error({}, "fluxer unavailable, error: ", err)
      }
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
          tableName: `${TABLE_PREFIX}_sessions`,
        }
      }, app.db),
      saveUninitialized: false
    })

    app.addHook('preHandler', (request, reply, next) => {
      if (request.headers.origin && CORS_WHITELIST.includes(request.headers.origin)) {
        reply.header("Access-Control-Allow-Origin", request.headers.origin)
      }
      return next()
    })

    const mainPrefix = `/api/`

    async function loadRoutes(rootPrefix: string = "/", folderPath: string) {
      const dirents = await readdir(folderPath, { withFileTypes: true })

      for (const dirent of dirents) {
        if (dirent.isDirectory()) {
          let prefix: string;
          if (dirent.name[0] === "!") {
            prefix = rootPrefix
            if (dirent.name[1] === "!") {
              app.register(async (fastify: FastifyInstance, opts: FastifyPluginOptions) => {
                fastify.addHook('preHandler', async (req, reply) => {
                  await fastify.authmngr.verify(req, reply)
                })
                await loadRoutes(prefix, path.join(folderPath, dirent.name))
              })
              continue
            }
          } else {
            prefix = `${rootPrefix}${dirent.name}/`
          }

          await loadRoutes(prefix, path.join(folderPath, dirent.name))

        } else if (dirent.isFile()) {
          const match = dirent.name.match(/^(.+)\.(.+)$/)
          if (!match) return
          const [, name, ext] = match
          if (ext === "js" || ext === "ts") {
            const prefix = (name === "index") ? rootPrefix : `${rootPrefix}${name}`
            try {
              await app.register(import(`file://${path.join(folderPath, dirent.name)}`), { prefix })
            } catch (err) {
              app.log.fatal(`Could not load route ${name}. prefix=${prefix}\n${err.stack}`)
              process.exit(1)
            }
          }
        }
      }

    }
    if (hadSignal) return

    await loadRoutes(mainPrefix, path.join(__dirname, './routes'))

    await setupNotFound(app as unknown as FastifyInstance)
    try {
      await app.listen({
        host: process.env.LISTEN_HOST,
        port: Number(process.env.LISTEN_PORT) || 8081
      })
      sendMetric("startup_time_ms", performance.now() - START_TIME)
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
    preHandler: app.rateLimit({
      max: 4,
      timeWindow: 500
    }),
  }, (req: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      error: "NOT_FOUND",
      message: `Route ${req.method} "${req.url}" not found`
    })
  })
}

/**
 * Schedules to add new partition to activity_log in a yearly basis
 */
function scheduleActivityLogPartition(app: FastifyInstance) {
  const endOfYear = new Date()
  endOfYear.setUTCMonth(11) // dec
  endOfYear.setUTCDate(31)
  endOfYear.setUTCHours(0)

  function nextDate(prev: Date) {
    prev.setFullYear(prev.getFullYear() + 1)
    return prev
  }

  const job = app.jobs.register("activity_log.add_year_partition", async () => {
    // This runs on Dec 31 of current year
    const nextYear = new Date().getFullYear() + 1
    await addPartitionForYear(app, nextYear)
  })

  app.jobs.scheduleRepeatingCustom(job, endOfYear, nextDate)
  // fire immediately as well
  job.execute()

}

async function addPartitionForYear(app: FastifyInstance, year: number) {
  const nextYear = year

  await app.db.query(`
    ALTER TABLE activity_log ADD PARTITION IF NOT EXISTS
    ( PARTITION p${year} VALUES LESS THAN ( UNIX_TIMESTAMP('${nextYear}-01-01 00:00') ) )`
  )

    app.log.info(`Added p${year} partition to activity log`)
}
