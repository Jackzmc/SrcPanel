import { FastifyInstance } from 'fastify';
import FastifyPlugin from 'fastify-plugin'
import User from '../modules/users/User.js';
import { SESSION_VERSION } from '../routes/auth/steam.js';
import { NOT_LOGGED_IN } from '../responses.js';

import * as Sentry from '@sentry/node'
import { CACHE_FOLDER, CONFIG_FOLDER, CoreModules, DATA_FOLDER } from '../core/index.js';
import { registerPlugin } from '../core/prom-metrics.js';

export const MAIN_DB = process.env.MYSQL_DB ?? 'left4dead2'
export const ADMINS_DB = process.env.MYSQL_ADMINS_DB ?? MAIN_DB

export const TABLE_PREFIX = "panel"



async function db(fastify: FastifyInstance, options: CoreModules) {
  await registerPlugin(fastify)

  fastify.decorate("cache", options.modules.cacheManager)
  fastify.decorate("paths", {
    config: CONFIG_FOLDER,
    cache: CACHE_FOLDER,
    data: DATA_FOLDER
  })
  fastify.decorate('users', options.modules.userManager)
  fastify.decorate('authmngr', options.modules.authManager)
  fastify.decorate('db', options.db.db)
  fastify.decorate('steam', options.modules.steam)
  fastify.decorate('servers', options.modules.serverManager)
  fastify.decorate('config', options.modules.configManager)
  fastify.decorate('jobs', options.modules.jobScheduler)
  fastify.decorate('managers', options.modules)
  fastify.decorate('data', options.modules.dataManager)
  fastify.decorate('logs', options.modules.logsManager)

  fastify.addHook('preHandler', async (req, reply) => {
    if (req.session?.user) {
      if (req.session.version !== SESSION_VERSION) {
        req.session.destroy()
        return NOT_LOGGED_IN(reply, "SESSION_EXPIRED", `Session has expired (target:${SESSION_VERSION}, cur:${req.session.version})`)
      }
      req.user = new User(fastify, req.session.user.steamid)
      Sentry.setUser({
        id: req.user.steamid2,
        username: req.user.cachedName,
        ip: req.ip
      })
    } else if (req.headers['x-apikey'] || req.headers['authorization']) {
      let token: string;
      if (req.headers['authorization']) {
        const split = req.headers['authorization'].split(" ")
        if (split.length == 2 && split[0] == "Bearer") token = split[1]
        else return NOT_LOGGED_IN(reply, "INVALID_APIKEY", "Invalid token or token type, must be Bearer <token>")
      } else if (typeof req.headers['x-apikey'] == 'string') {
        token = req.headers['x-apikey']
      } else {
        return NOT_LOGGED_IN(reply, "INVALID_APIKEY", "Missing or invalid x-apikey or authorization header")
      }
      const apikey = await fastify.authmngr.getAPIKey(token)
      if (apikey)
        req.user = new User(fastify, apikey.steamid)
    }
  })
  fastify.addHook("onClose", (inst, done) => {
    fastify.servers.onShutdown()
    fastify.log.info("Shutdown complete")
    done()
  })
}
export default FastifyPlugin(db)
