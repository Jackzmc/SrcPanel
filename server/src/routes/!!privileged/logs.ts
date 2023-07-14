import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { NO_PERMISSION } from '../../responses.js';

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
    search_client: Type.Optional(Type.String()),
    search_target: Type.Optional(Type.String()),
    aroundId: Type.Optional(Type.Integer()),
    fetchAll: Type.Optional(Type.Boolean()),
    limit: Type.Optional(Type.Integer()),
    page: Type.Optional(Type.Integer()),
    optimized: Type.Optional(Type.String()),
    timestampOnly: Type.Optional(Type.Boolean({ default: false })),
    source: Type.Optional(Type.String())
})

type LogQueryType = Static<typeof LogQuery>

export const ACTIVITY_LOG_TABLE_NAME = 'activity_log'
const LOG_TOTAL_ROW_CACHE_TIME = 30_000 //ms

let logServerCache = []
interface DataCache {
    totalRows: number,
    highestId: number,
    lastFetchTime: number
}
let cache: Record<string, DataCache> = {}

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    const [rows] = await fastify.db.query<RowDataPacket[]>(`SELECT DISTINCT server FROM ${ACTIVITY_LOG_TABLE_NAME} ORDER BY timestamp DESC`)
    logServerCache = rows.filter(row => row.server && row.server !== "web").map(row => row.server)

    async function getTotalRows(tableName = ACTIVITY_LOG_TABLE_NAME): Promise<DataCache> {
        if(!cache[tableName] ||Date.now() - cache[tableName].lastFetchTime > LOG_TOTAL_ROW_CACHE_TIME) {
            const [c] = await fastify.db.execute<RowDataPacket[]>(`SELECT COUNT(*) AS count, MAX(id) as highestId from ${tableName}`)
            cache[tableName] = {
                totalRows: c[0].count,
                highestId: c[0].highestId,
                lastFetchTime: Date.now()
            }
        }
        return cache[tableName]
    }

    fastify.get('/data', async(req, reply) => {
        return {
            servers: logServerCache,
            cache: {
                main: await getTotalRows("activity_log"),
                archive: await getTotalRows("activity_log_archive")
            }
        }
    })

    fastify.post('/batch', (req: FastifyRequest<{ Querystring: LogQueryType, Params: { page?: number } }>, reply) => {
        const id = fastify.jobs.add("SELECT * FROM activity_log", "SELECT COUNT(*) FROM activity_log", [], [])
        return { id }
    })

    fastify.get('/batch/:id', (req: FastifyRequest<{ Params: { id: number } }>, reply) => {
        if(!req.params.id) return "404"
        const response = fastify.jobs.get(req.params.id)
        return response
    })

    /// PLAN:
    /*
    1. Have only ~ 10,000 rows (roughly ~ month of data)
    2. Move the rest into archive table
    3. When running query, if < 10 seconds, return data
        If >= 10 seconds, return a batch id user can fetch
    */
    fastify.get('/:page?', async(req: FastifyRequest<{ Querystring: LogQueryType, Params: { page?: number } }>, reply) => {
        if(!req.user.hasPermission("logs.view")) return NO_PERMISSION(reply)
        const searchMessage = req.query.searchMessage ? `%${req.query.searchMessage}%` : (req.query.search_message ? `%${req.query.search_message}%` : null)
        const clientSearch = req.query.client ?? req.query.search_client
        const targetSearch = req.query.target ?? req.query.search_target

        let tableName = ACTIVITY_LOG_TABLE_NAME
        if(!req.query.source) req.query.source = "main"
        if(req.query.source != "main") tableName += `_${req.query.source}`
        const optimized = req.query.optimized !== "false" && !clientSearch && !targetSearch && !searchMessage 
            && !req.query.servers?.includes("web") 
            && req.query.source == "main"
        let countQuery = `SELECT COUNT(*) AS count from ${tableName} `
        let query = `SELECT id, l.timestamp, server, type, client, target, message, metadata,
            s1.last_alias as clientName, s2.last_alias as targetName,
            u1.avatar_hash as clientAvatar, u2.avatar_hash as targetAvatar
            FROM ${tableName} l
            LEFT JOIN stats_users as s1 ON s1.steamid = client 
            LEFT JOIN stats_users as s2 ON s2.steamid = target 
            LEFT JOIN user_names u1 ON u1.steamid LIKE SUBSTRING(l.client, 11) 
            LEFT JOIN user_names u2 ON u2.steamid LIKE SUBSTRING(l.target, 11)`

        const conditions = []
        let data = [], countData = []
        let limit = Number(req.query.limit) || 50
        if(limit <= 0) limit = 50

        let page = Number(req.params.page || req.query.page) || 1
        if(page <= 0) page = 1

        const cache = await getTotalRows(tableName)
        if(req.query.timestampOnly) {
            query = `SELECT timestamp, message FROM ${ACTIVITY_LOG_TABLE_NAME} l`
        } else if(optimized) {
            const maxId = cache.highestId - (2*limit * (page - 1))
            const minId = maxId - (2*limit)
            // We don't need to also fetch usernames from user_names as if there is a log entry they should always have an entry in statistics 
            query += " WHERE id >= ? AND id <= ? "
            // TODO:L Only use optimized when no filters are applied - optimization doens't work with them
            data.push(minId, maxId)
        }


        if(req.query.servers && req.query.servers !== "") {
            const servers = req.query.servers.split(",")
            if(servers.length > 0) {
                conditions.push(`server IN (${generateParams(servers.length)})`)
                data = [ ...data, ...servers ]
                countData = [ ...countData, ...servers ]
            }
        }
        if(req.query.types && req.query.types !== "") {
            const types = req.query.types.split(",")
            if(types.length > 0) {
                conditions.push(`type IN (${generateParams(types.length)})`)
                data = [ ...data, ...types ]
                countData = [ ...countData, ...types ]
            }
        }
        if(clientSearch && targetSearch) {
            conditions.push('(client = ? OR target = ?)')
            data = [ ...data, clientSearch, targetSearch ]
            countData = [ ...countData, clientSearch, targetSearch ]
        } else if(clientSearch && !targetSearch) {
            conditions.push('client = ?')
            data.push(clientSearch)
            countData.push(clientSearch)
        } else if(!clientSearch && targetSearch) {
            conditions.push('target = ?')
            data.push(targetSearch)
            countData.push(targetSearch)
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
            if(optimized) {
                // Optimized query already has WHERE condition
                query += ` AND ${conditions.join(' AND ')} `
            } else {
                query += ` WHERE ${conditions.join(' AND ')} `
            }
            countQuery += ` WHERE ${conditions.join(' AND ')} `
        }

        query += `ORDER BY id ${req.query.orderByAscending ? 'ASC' : 'DESC'} `

        if(!req.query.fetchAll) {
            if(optimized) {
                query += `LIMIT ?`
                data = [...data, limit] //, (page * limit) - limit]
            } else {
                query += `LIMIT ? OFFSET ?`
                data = [...data, limit, (page * limit) - limit]
            }
        }

        const startTime = Date.now()
        // TODO: put count query as sub query??
        const [[logs], [count]] = await Promise.all([
            fastify.db.execute<RowDataPacket[]>(query, data),
            fastify.db.execute<RowDataPacket[]>(countQuery, countData)
        ])
        
        return {
            logs: logs.map(log => {
                if(log.metadata) log.metadata = JSON.parse(log.metadata)
                return log
            }),
            timeTaken: Date.now() - startTime,
            wasOptimized: optimized,
            totals: {
                total: cache.totalRows, // # of rows in entire data source
                filteredTotal: count[0].count, // # of rows in entire data source WITH filters
                count: logs.length // # of rows + filtered + pagination (<= limit)
            },
            pages: Math.ceil(count[0].count / limit),
            raw: process.env.NODE_ENV === "production" ? null : {
                cache: cache[tableName],
                query,
                countQuery,
                data,
                countData,
                tableName
            }
        }
        
    })

    fastify.post("/:id/redact", async(req: FastifyRequest<{Params: {id: 'string'}}>, reply) => {
        if(!req.user.hasPermission("logs.redact")) return NO_PERMISSION(reply)
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