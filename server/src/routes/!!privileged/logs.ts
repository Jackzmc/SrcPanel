import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid'

const LogQuery = Type.Object({
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
    aroundId: Type.Optional(Type.Integer()),
    fetchAll: Type.Optional(Type.Boolean()),
    limit: Type.Optional(Type.Integer()),
    timestampOnly: Type.Optional(Type.Boolean({ default: false }))
})

type LogQueryType = Static<typeof LogQuery>

export const ACTIVITY_LOG_TABLE_NAME = 'activity_log'
const LOG_TOTAL_ROW_CACHE_TIME = 30_000 //ms

let logServerCache = []
let totalRows = 0
let totalRowsLastFetch: number = null

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    const [rows] = await fastify.db.query<RowDataPacket[]>(`SELECT DISTINCT server FROM ${ACTIVITY_LOG_TABLE_NAME}`)
    logServerCache = rows.filter(row => row.server !== "web").map(row => row.server)

    async function getTotalRows() {
        if(Date.now() - totalRowsLastFetch > LOG_TOTAL_ROW_CACHE_TIME || totalRowsLastFetch === null) {
            const [c] = await fastify.db.execute<RowDataPacket[]>(`SELECT COUNT(*) AS count from ${ACTIVITY_LOG_TABLE_NAME}`)
            totalRows = c[0].count
            totalRowsLastFetch = Date.now()
        }
        return totalRows
    }

    fastify.get('/servers', async(req, reply) => {
        return {
            servers: logServerCache
        }
    })

    fastify.get('/:page?', async(req: FastifyRequest<{ Querystring: LogQueryType, Params: { page?: number } }>, reply) => {
        const searchMessage = req.query.searchMessage ? `%${req.query.searchMessage}%` : (req.query.search_message ? `%${req.query.search_message}%` : null)

        let countQuery = `SELECT COUNT(*) AS count from ${ACTIVITY_LOG_TABLE_NAME} `
        let query: string;

        if(req.query.timestampOnly) {
            query = `SELECT timestamp, message FROM ${ACTIVITY_LOG_TABLE_NAME} l`
        } else {
            // We don't need to also fetch usernames from user_names as if there is a log entry they should always have an entry in statistics 
            query = `SELECT id, timestamp, server, type, client, target, message, metadata,
                s1.last_alias as clientName, s2.last_alias as targetName,
                u1.avatar_hash as clientAvatar, u2.avatar_hash as targetAvatar
                FROM activity_log l
                LEFT JOIN stats_users as s1 ON s1.steamid = client 
                LEFT JOIN stats_users as s2 ON s2.steamid = target 
                LEFT JOIN user_names u1 ON u1.steamid LIKE SUBSTRING(l.client, 11) 
                LEFT JOIN user_names u2 ON u2.steamid LIKE SUBSTRING(l.target, 11) 
            `
        }

        const conditions = []
        let data = [], countData = []
        let limit = Number(req.query.limit) || 50
        if(limit <= 0) limit = 50

        let page = Number(req.params.page) || 1
        if(page <= 0) page = 1

        const totalRows = await getTotalRows()
        // Optimize query by calculating the minimum id based on totalRows
        const minId = totalRows - (limit * page)
        conditions.push(`id > ${minId}`)

        if(req.query.servers) {
            const servers = req.query.servers.split(",")
            conditions.push(`server IN (${generateParams(servers.length)})`)
            data = [ ...data, ...servers ]
            countData = [ ...countData, ...servers ]
        }
        if(req.query.types) {
            const types = req.query.types.split(",")
            conditions.push(`type IN (${generateParams(types.length)})`)
            data = [ ...data, ...types ]
            countData = [ ...countData, ...types ]
        }
        if(req.query.client && req.query.target) {
            conditions.push('(client = ? OR target = ?)')
            data = [ ...data, req.query.client, req.query.target ]
            countData = [ ...countData, req.query.client, req.query.target ]
        } else if(req.query.client && !req.query.target) {
            conditions.push('client = ?')
            data.push(req.query.client)
            countData.push(req.query.client)
        } else if(!req.query.client && req.query.target) {
            conditions.push('target = ?')
            data.push(req.query.target)
            countData.push(req.query.target)
        }

        if(req.query.timestamp) {
            conditions.push(req.query.timestampBefore ? 'timestamp <= ?' : 'timestamp >= ?')
            data.push(req.query.timestamp)
            countData.push(req.query.timestamp)
        }

        if(searchMessage) {
            conditions.push(`message LIKE ?`)
            data.push(searchMessage)
            countData.push(searchMessage)
        }

        const aroundId = Number(req.query.aroundId || req.query.search_id)
        if(aroundId) {
            const min = aroundId - limit
            const max = aroundId + limit
            limit *= 2
            conditions.push(`id >= ? AND id <= ?`)
            data = [ ...data, min, max ]
            countData = [ ...countData, min, max ]
        }
        
        if(conditions.length > 0) {
            query += `WHERE ${conditions.join(' AND ')} `
            countQuery += `WHERE ${conditions.join(' AND ')} `
        }

        query += `ORDER BY id ${req.query.orderByAscending ? 'ASC' : 'DESC'} `

        if(!req.query.fetchAll) {
            query += `LIMIT ? OFFSET ?`
            data = [...data, Number(limit), (page * limit) - limit]
        }

        const [[logs], [count]] = await Promise.all([
            fastify.db.execute(query, data),
            fastify.db.execute(countQuery, countData)
        ])
        // const [logs] = await fastify.db.query(query, data)
        // const [count] = await fastify.db.query(countQuery, countData)

        return {
            logs,
            totalCount: count[0].count,
            raw: process.env.NODE_ENV === "production" ? null : {
                query,
                countQuery,
                data,
                countData
            }
        }
        
    })

    fastify.post("/:id/redact", async(req: FastifyRequest<{Params: {id: 'string'}}>, reply) => {
        if(!req.params.id) {
            return reply.code(404).send({
                error: "NOT_FOUND",
                message: `Could not find log id ${req.params.id}`
            })
        }

        const [rows] = await fastify.db.query<RowDataPacket[]>("SELECT id, message, type, client FROM activity_log WHERE id = ?", [ req.params.id ])
        if(rows.length == 0) {
            return reply.code(404).send({
                error: "NOT_FOUND",
                message: `Could not find log id ${req.params.id}`
            })
        }

        if(rows[0].type === "CHAT" || (rows[0].type === "ACTION" && rows[0].message.includes("sm_chat"))) {
            if(rows[0].client === req.session.user.steamid) {
                fastify.log.info(`${req.session.user.steamid} has redacted message ${rows[0].message}`)

                await fastify.db.query("UPDATE activity_log SET message = '[redacted]' WHERE id = ?", [ rows[0].id ])
        
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