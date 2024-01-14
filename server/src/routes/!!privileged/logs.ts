import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { NO_PERMISSION } from '../../responses.js';
import { QueryBuilder, SortDirection } from '../../modules/QueryBuilder.js';
import SteamID from 'steamid';

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
    source: Type.Optional(Type.String()),
    afterId: Type.Optional(Type.Number())
})

type LogQueryType = Static<typeof LogQuery>

export const ACTIVITY_LOG_TABLE_NAME = 'activity_log'
const LOG_TOTAL_ROW_CACHE_TIME = 30_000 //ms
const MISSING_NAME_MIN_INTERVAL = 1000 * 30 // Do not fetch if last fetch was between this

let logServerCache = []
interface DataCache {
    totalRows: number,
    highestId: number,
    lastFetchTime: number
}
let cache: Record<string, DataCache> = {}
let lastMissingNameFetchTime = 0

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    const [rows] = await fastify.db.query<RowDataPacket[]>(`SELECT DISTINCT server FROM ${ACTIVITY_LOG_TABLE_NAME} ORDER BY timestamp DESC`)
    logServerCache = rows.filter(row => row.server && row.server !== "web").map(row => row.server)

    // TODO: query list of activity_log* tables and pass them to UI

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

    const VALID_TYPES = ["before","after","around"]
    fastify.get('/:type/:id', async (req: FastifyRequest<{ Querystring: LogQueryType, Params: { type: string, id: number}}>, reply) => {
        const type = req.params.type
        if(!VALID_TYPES.includes(type)) {
            return reply.status(400).send({
                error: "BAD_REQUEST",
                message: `Unknown type ${req.params.type}, should be one of: ${VALID_TYPES}` 
            })
        }

        const limit = req.query.limit ?? 30 

        let tableName = ACTIVITY_LOG_TABLE_NAME
        if(!req.query.source) req.query.source = "main"
        if(req.query.source != "main") tableName += `_${req.query.source}`

        const query = new QueryBuilder(tableName, "l")
            .selectMultiple("id", "l.timestamp", "server", "type", "client", "target", "message", "metadata")
            .select("s1.name", "clientName")
            .select("s2.name", "targetName")
            .leftJoin("user_names", "steamid", "=", "SUBSTRING(client, 11)", "s1", true)
            .leftJoin("user_names", "steamid", "=", "SUBSTRING(target, 11)", "s2", true)
            .limit(limit)
            .sort('id', SortDirection.Descending)

        if(type === 'before') query.where("id", '<=', req.params.id)
        else if(type === 'after') query.where("id", '>', req.params.id)
        else if(type === 'around') {
            const half = Math.ceil(limit / 2)
            query.where("id", '>', Number(req.params.id) - half)
                 .where("id", '<=', Number(req.params.id) + half)
        }

        if(req.query.search_client) query.where('client', '=', req.query.search_client)
        if(req.query.search_target) query.where('target', '=', req.query.search_target)
        if(req.query.search_message) query.where('message','LIKE',`%${req.query.search_message}%`)
        const servers = req.query.servers?.split(/[+, ]/g)
        const types = req.query.types?.split(/[+, ]/g)
        if(servers) {
            query.whereIn('server', servers)
        }
        if(types) {
            // type in (?,?,?) OR server = 'web' AND server IN (?,?,?)
            query.whereIn('type', types)
            if(servers.includes('web')) {
                // TODO: if .servers includes 'web', do AND type IN () OR server = 'web'
                // query.where('server', 'web')
                query.or([
                    ['server', '=', 'web']
                ])
            }
        }
        
        const startTime = Date.now()
        let [logs] = (await query.execute(fastify.db))

        let cache = await getTotalRows(tableName)
        const missingNameSet = new Set<SteamID>()

        logs = logs.map(log => {
            if(log.metadata) log.metadata = JSON.parse(log.metadata)
            // If its a valid user but no name, then put it in a list to be updated:
            if(!log.clientName && log.client?.startsWith("STEAM_")) {
                missingNameSet.add(new SteamID(log.client))
            }
            if(!log.targetName && log.target?.startsWith("STEAM_")) {
                missingNameSet.add(new SteamID(log.target))
            }
            // Side effect, but update highest id recorded
            if(log.id > cache.highestId) {
                cache.highestId = log.id
            }
            return log
        })
        // If we have missing names, fetch it in bulk (only every MISSING_NAME_MIN_INTERVAL ms)
        if(missingNameSet.size > 0 && Date.now() - lastMissingNameFetchTime > MISSING_NAME_MIN_INTERVAL) {
            try {
                const newNames = await fastify.users.fetchUsers([...missingNameSet])
                const nameRecord: Record<string,string> = {}
                // Push the array into a record
                for(const user of newNames) {
                    nameRecord[user.steamid] = user.name
                }
                // Iterate logs and replace
                // TODO: this is failing to find and replace
                for(const log of logs) {
                    if(log.client && !log.clientName) {
                        log.clientName = nameRecord[log.client.slice(10)]
                    }
                    if(log.target && !log.targetName) {
                        log.targetName = nameRecord[log.target.slice(10)]
                    }
                }
                lastMissingNameFetchTime = Date.now()
            } catch(err) {
                fastify.log.warn(`[logs] Could not fetch missing names (${[...missingNameSet].toString()}):`, err)
            }
        }

        return {
            logs,
            timeTaken: Date.now() - startTime,
            cache,
            totals: {
                total: cache.totalRows, // # of rows in entire data source
                count: logs.length // # of rows + filtered + pagination (<= limit)
            },
            // pages: Math.ceil(count[0].count / limit),
            raw: process.env.NODE_ENV === "production" ? null : {
                cache: cache[tableName],
                query: query.buildUnsafe(),
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