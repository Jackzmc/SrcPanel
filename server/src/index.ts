import 'dotenv/config'
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import FastifyCookie from '@fastify/cookie'
import FastifySession from '@fastify/session'
import fastifyWebsocket from '@fastify/websocket'
import FastifyEtag from '@fastify/etag'
import MySQLSession from 'express-mysql-session'
import { Pool, RowDataPacket } from 'mysql2/promise';
import SteamAPI from './modules/steam.js'
import AuthManager from './modules/auth/AuthManager.js';
import ServerManager from './modules/servers/ServerManager.js';
import UserManager from './modules/users/UserManager.js';
import { readdir } from 'fs/promises';
import path from 'path'
import cors from '@fastify/cors'
import fastifyUrlData from '@fastify/url-data'

import { FastifyPluginOptions } from 'fastify';
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
import init, { MAIN_DB, onCoreShutdown } from './core/index.js'

import './sentry.js'

const START_TIME = performance.now()
const FORCE_SHUTDOWN_TIMEOUT = 20_000

const MySQLStore = MySQLSession(FastifySession)

import loggerInstance from './logger.js'

const core = await init()

const app = Fastify({
  pluginTimeout: 30_000,
  trustProxy: process.env.NODE_ENV === "production",
  loggerInstance
})
import * as Sentry from '@sentry/node' 
Sentry.setupFastifyErrorHandler(app);

process.on('unhandledRejection', (reason: any, promise ) => {
  app.log.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1)
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
    await onCoreShutdown(),
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
  interface Session extends CustomFastifySession { }
}


const CORS_WHITELIST = process.env.CORS_WHITELIST ? process.env.CORS_WHITELIST.split(",") : ["localhost:8080"]
await app.register(cors, {
  origin: CORS_WHITELIST,
  methods: ["GET", "POST", "PATCH", "UPDATE", "DELETE"]
})
await app.register(FastifyHelmet, {
  // TODO: proper impl
  contentSecurityPolicy: false
})
await app.register(FastifyEtag)
await app.register(fastifyWebsocket)
await app.register(fastifyUrlData)
import internalMetrics from './hooks/metrics.js'
import { METRIC_STARTUP_TIME } from './core/prom-metrics.js'

await app.register(internalMetrics)

app.setErrorHandler((error, request, reply) => {
  app.log.error(error)
  Sentry.captureException(error);
  return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error has occurred' });
});



await app.register(MiddleManager, core)
  .then(async () => {

    scheduleActivityLogPartition(app as unknown as FastifyInstance);

    if  (hadSignal) return
    if  (process.env.FLUXER_API_TOKEN) {
      try {
        const bot = new FluxerBot(app.servers, app.cache, process.env.FLUXER_API_TOKEN as string)
        await bot.init()
      } catch (err) {
        app.log.error({err}, "fluxer initialize error")
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
      cookieName: 'srcpanel_session',
      cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        // sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
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

    // CORS: 
    app.addHook('preHandler', (request, reply, next) => {
      if (request.headers.origin && CORS_WHITELIST.includes(request.headers.origin)) {
        reply.header("Access-Control-Allow-Origin", request.headers.origin)
      }
      return next()
    })

    const mainPrefix = `/api/`

    async function loadRoutes(rootPrefix: string = "/", folderPath: string) {
      const dirents = await readdir(folderPath, { withFileTypes: true })

      /**
       * This system is... old and messy
       * The original idea was !! prefixed folders would be authenticated and single ! would be unauthenticated
       * But should just have an "authorized" and "unauthorized" folder instead of the weird prefix system
       */

      for (const dirent of dirents) {
        if (dirent.isDirectory()) {
          let prefix: string;
          if (dirent.name[0] === "!") {
            prefix = rootPrefix
            if (dirent.name[1] === "!") {
              app.register(async (fastify: FastifyInstance, opts: FastifyPluginOptions) => {
                // Add auth check to !! folder routes
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
          // Check if a file, then check if js/ts file
          const match = dirent.name.match(/^(.+)\.(.+)$/)
          if (!match) return
          const [, name, ext] = match
          if (ext === "js" || ext === "ts") {
            // Figure out route prefix from name (index -> use folder, otherwise use file name)
            const prefix = (name === "index") ? rootPrefix : `${rootPrefix}${name}`
            try {
              await app.register(import(`file://${path.join(folderPath, dirent.name)}`), { prefix })
            } catch (err) {
              app.log.fatal({ err }, `Could not load route ${name}. prefix=${prefix}`)
              process.exit(1)
            }
          }
        }
      }

    }
    if (hadSignal) return

    await loadRoutes(mainPrefix, path.join(import.meta.dirname, './routes'))

    await setupNotFound(app as unknown as FastifyInstance)
    
    await app.listen({
      host: process.env.LISTEN_HOST || '0.0.0.0',
      port: Number(process.env.LISTEN_PORT) || 8081
    })
    METRIC_STARTUP_TIME.set(performance.now() - START_TIME)
    sendMetric("startup_time_ms", performance.now() - START_TIME)
    
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

// TODO: move to own file?
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
    console.log('absolutely no run bad very bad')
    // This runs on Dec 31 of current year
    const nextYear = new Date().getFullYear() + 1
    await addPartitionForYear(app, nextYear)
  })

  app.jobs.scheduleRepeatingCustom(job, endOfYear, nextDate)

}

async function addPartitionForYear(app: FastifyInstance, year: number) {
  console.log('SHOULD NOT RUN')
  const nextYear = year

  try {
    // Check if we need to add a partition
    const [partitions] = await app.db.query<RowDataPacket[]>(`
      SELECT * FROM information_schema.partitions
         WHERE TABLE_SCHEMA='left4dead2'
           AND TABLE_NAME = 'activity_log'
           AND PARTITION_NAME IS NOT NULL
        ORDER BY PARTITION_DESCRIPTION
        LIMIT 1`
    )
    // Maybe not the best check but it should work
    const hasYear = partitions.some(part => parseInt(part.PARTITION_NAME.substring(1)) === year)
    if(!hasYear) {
      await app.db.query(`
        ALTER TABLE activity_log ADD PARTITION IF NOT EXISTS
        ( PARTITION p${year} VALUES LESS THAN ( UNIX_TIMESTAMP('${nextYear}-01-01 00:00') ) )`
      )

      app.log.info(`Added p${year} partition to activity log`)
  }
  } catch(err) {
    app.log.warn({}, "failed to update partition for year: " + err)
  }
}
