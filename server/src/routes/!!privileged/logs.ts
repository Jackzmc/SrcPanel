import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { NO_PERMISSION } from '../../util/responses.js';
import { APILogData, APILogQueryResult } from '@srcpanel/common/Logs';
import { sendInvalidParamError } from '../../guards/responses.js';
import { FetchLogsParamsSchema, FetchLogsQuerySchema, type APIFetchLogsParams, type APIFetchLogsQuery } from '@srcpanel/common/logs/schemas'

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

  fastify.get(
    '/:type/:id', 
    { schema: { querystring: FetchLogsQuerySchema, params: FetchLogsParamsSchema }},
    async (req: FastifyRequest<{ Querystring: APIFetchLogsQuery, Params: APIFetchLogsParams }>, reply): Promise<APILogQueryResult> => {
      if (!fastify.logs.loaded) return reply.status(503).send({
        error: "NOT_READY",
        message: "Logs have not been loaded yet, please try again later"
      })
      const startTime = performance.now()
      const [logs, yearInfo] = await fastify.logs.fetchLogs(req.params.type, req.params.id, {
        year: req.query.year,
        types: req.query.types,
        servers: req.query.servers,
        searchClient: req.query.search_client,
        searchTarget: req.query.search_target,
        searchMessage: req.query.search_message
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
