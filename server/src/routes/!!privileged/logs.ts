import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { Static, Type } from '@sinclair/typebox'
import { NO_PERMISSION } from '../../responses.js';
import { QueryBuilder, SortDirection } from '../../modules/QueryBuilder.js';
import SteamID from 'steamid';
import { APILogData, APILogQueryResult, LogEntry } from '@srcpanel/common/Logs';
import { TABLE_PREFIX } from '../../middlewares/managers.js';
import { ACTIVITY_LOG_TABLE_NAME } from '../../modules/logs/LogsManager.js';
import PlayerManager from '../../modules/users/PlayerManager.js';
import { sendInvalidParamError } from '../../guards/index.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LogQuery = Type.Object({
  raw: Type.Optional(Type.Boolean({ default: false })),
  servers: Type.Optional(Type.String()),
  types: Type.Optional(Type.String()),
  client: Type.Optional(Type.String()),
  target: Type.Optional(Type.String()),
  timestamp: Type.Optional(Type.Integer()),
  timestampBefore: Type.Optional(Type.Boolean()),
  orderByColumn: Type.Optional(Type.String()),
  orderByAscending: Type.Optional(Type.Boolean()),
  searchMessage: Type.Optional(Type.String()),
  search_message: Type.Optional(Type.String()),
  search_id: Type.Optional(Type.Integer()),
  search_client: Type.Optional(Type.String()),
  search_target: Type.Optional(Type.String()),
  aroundId: Type.Optional(Type.Integer()),
  fetchAll: Type.Optional(Type.Boolean()),
  limit: Type.Optional(Type.Integer()),
  page: Type.Optional(Type.Integer()),
  optimized: Type.Optional(Type.String()),
  timestampOnly: Type.Optional(Type.Boolean({ default: false })),
  source: Type.Optional(Type.String()),
  afterId: Type.Optional(Type.Number())
})

type LogQueryType = Static<typeof LogQuery>

const ADMIN_CHAT_REGEX = new RegExp(/triggered (sm_say|sm_chat) \(text (.*)\)/)

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {

  fastify.get('/data', async (req, reply): Promise<APILogData> => {
    // update data
    await fastify.logs.updateCurrentYear()

    return {
      servers: fastify.logs.servers,
      years: fastify.logs.yearData,
      computedTotal: fastify.logs.totalRows,

      fullyLoaded: fastify.logs.loaded
    }
  })

  const VALID_TYPES = ["before", "after", "around"]
  fastify.get('/:type/:id', async (req: FastifyRequest<{ Querystring: LogQueryType, Params: { type: string, id: number } }>, reply): Promise<APILogQueryResult> => {
    if (!fastify.logs.loaded) return reply.status(503).send({
      error: "NOT_READY",
      message: "Logs is not yet ready, try again later"
    })
    const type = req.params.type
    if (!VALID_TYPES.includes(type)) {
      return reply.status(400).send({
        error: "BAD_REQUEST",
        message: `Unknown type ${req.params.type}, should be one of: ${VALID_TYPES}`
      })
    }

    const limit = req.query.limit ?? 30

    const tableName = ACTIVITY_LOG_TABLE_NAME

    const query = new QueryBuilder(tableName, "l")
      .selectMultiple("id", "l.timestamp", "server", "type", "client", "target", "message", "metadata")
      .select("s1.last_name", "clientName")
      .select("s2.last_name", "targetName")
      .leftJoin(`view_${TABLE_PREFIX}_user`, "account_id", "=", "SUBSTRING(client, 11)", "s1", true)
      .leftJoin(`view_${TABLE_PREFIX}_user`, "account_id", "=", "SUBSTRING(target, 11)", "s2", true)
      .limit(limit)
      .sort('id', SortDirection.Descending)
    const sourceAsYear = req.query.source && parseInt(req.query.source)
    if(sourceAsYear && !isNaN(sourceAsYear)) {
      query
        .where("timestamp", ">=", Math.floor(new Date(`${sourceAsYear}-01-01T00:00:00`).getTime() / 1000))
        .where("timestamp", "<", Math.floor(new Date(`${sourceAsYear + 1}-01-01T00:00:00`).getTime() / 1000))
    }

    if (type === 'before') query.where("id", '<=', req.params.id)
    else if (type === 'after') query.where("id", '>', req.params.id)
    else if (type === 'around') {
      const half = Math.ceil(limit / 2)
      query.where("id", '>', Number(req.params.id) - half)
        .where("id", '<=', Number(req.params.id) + half)
    }

    if (req.query.search_client) query.where('client', '=', req.query.search_client)
    if (req.query.search_target) query.where('target', '=', req.query.search_target)
    if (req.query.search_message) query.where('message', 'LIKE', `%${req.query.search_message}%`)
    const servers = req.query.servers?.split(/[+, ]/g)
    const types = req.query.types?.split(/[+, ]/g)
    if (servers) {
      query.whereIn('server', servers)
    }
    if (types) {
      // type in (?,?,?) OR server = 'web' AND server IN (?,?,?)
      query.whereIn('type', types)
    }

    const startTime = Date.now()
    const [rawLogs] = (await query.execute(fastify.db))

    let year = parseInt(req.query.source as string)
    if (!year || isNaN(year)) year = fastify.logs.currentYear
    const yearInfo = await fastify.logs.getYearData(year)

    const logs = rawLogs.map(log => {
      if (log.metadata) log.metadata = JSON.parse(log.metadata)
      // If its a valid user but no name, then put it in a list to be updated:
      if (!log.clientName && log.client?.startsWith("STEAM_")) {
        PlayerManager.instance.enqueueNameResolve(new SteamID(log.client))
      }
      if (!log.targetName && log.target?.startsWith("STEAM_")) {
        PlayerManager.instance.enqueueNameResolve(new SteamID(log.target))
      }
      // Side effect, but update highest id recorded
      if (yearInfo && log.id > yearInfo.maxId) {
        yearInfo.maxId = log.id
      }

      if (log.type == 'ACTION') {
        const match = log.message.match(ADMIN_CHAT_REGEX)
        if (match) {
          log.type = 'CHAT'
          // Kindaaa messy, but we do want to keep the raw message
          log.metadata = {
            admin_chat: true,
            command: match[1],
            text: match[2]
          }
        }
      }
      return log as LogEntry
    })

    return {
      logs,
      timeTaken: Date.now() - startTime,
      yearInfo: yearInfo,
      counts: {
        queryRows: logs.length
      },
      // pages: Math.ceil(count[0].count / limit),
      raw: process.env.NODE_ENV === "production" || req.query.raw ? null : {
        cache: yearInfo ? yearInfo[tableName] : undefined,
        query: query.buildUnsafe(),
        tableName,
      }
    }
  })

  fastify.post("/:id/redact", async (req: FastifyRequest<{ Params: { id: 'string' } }>, reply) => {
    if (!req.user!.hasPermission("logs.redact")) return NO_PERMISSION(reply)
    const id = parseInt(req.params.id)
    if (isNaN(id)) {
      return sendInvalidParamError(reply, "id")
    }

    const log = await fastify.logs.getLog(id)
    if (!log) {
      return reply.code(404).send({
        error: "NOT_FOUND",
        message: `Could not find log id ${req.params.id}`
      })
    }

    if (log.type === "CHAT" || (log.type === "ACTION" && log.message.includes("sm_chat"))) {
      if (log.client === req.session.user.steamid) {
        await fastify.logs.redactId(id)
        
        req.log.info({ steamid: req.session.user.steamid, message: log.message }, "redacted message")

        return reply.code(204).send()
      } else {
        return reply.code(401).send({
          error: "INVALID_REDACT_USER",
          message: "You can only redact your own messages"
        })
      }
    } else {
      return reply.code(401).send({
        error: "INVALID_REDACT_TYPE",
        message: "You can only redact chat messages"
      })
    }
  })
}

export function generateParams(length: number) {
  return Array(length).fill(`?`).join(",")
}
