import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { Static, Type } from '@sinclair/typebox'
import { NO_PERMISSION } from '../../util/responses.js';
import { APILogData, APILogQueryResult } from '@srcpanel/common/Logs';
import { ACTIVITY_LOG_TABLE_NAME } from '../../modules/logs/LogsManager.js';
import { sendInvalidParamError } from '../../guards/index.js';
import { FetchLogsParamsSchema, FetchLogsQuerySchema, type APIFetchLogsParams, type APIFetchLogsQuery } from '@srcpanel/common/logs/schemas'

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
  fastify.get(
    '/:type/:id', 
    { schema: { querystring: FetchLogsQuerySchema, params: FetchLogsParamsSchema }},
    async (req: FastifyRequest<{ Querystring: APIFetchLogsQuery, Params: APIFetchLogsParams }>, reply): Promise<APILogQueryResult> => {
      if (!fastify.logs.loaded) return reply.status(503).send({
        error: "NOT_READY",
        message: "Logs have not been loaded yet, please try again later"
      })
      const type = req.params.type
      if (!VALID_TYPES.includes(type)) {
        return reply.status(400).send({
          error: "BAD_REQUEST",
          message: `Unknown type ${req.params.type}, should be one of: ${VALID_TYPES}`
        })
      }
      const startTime = performance.now()
      const [logs, yearInfo] = await fastify.logs.fetchLogs(type as "before" | "after" | "around", req.params.id, {
        year: req.query.year,
        types: req.query.types,
        servers: req.query.servers,
        searchClient: req.query.searchClient,
        searchTarget: req.query.searchTarget,
        searchMessage: req.query.searchMessage
      })

      return {
        logs,
        yearInfo,
        timeTaken: performance.now() - startTime,
        counts: {
          queryRows: logs.length
        }
      }
    }
  )

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
