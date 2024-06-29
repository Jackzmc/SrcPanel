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
const MISSING_NAME_MIN_INTERVAL = 1000 * 20 // Do not fetch if last fetch was between this

interface DataCache {
    totalRows: number,
    highestId: number,
    lowestId: number,
    lastFetchTime: number
}
interface SetCache<T> {
    set: Set<T>,
    lastFetchTime: number
}
class SetCache<T> {
    set: Set<T>
    lastFetchTime: number
    staleTime: number
    #getData: () => Promise<Set<T>>
    #isStaleFn: (fetchTime: number, staleTime: number) => boolean
    constructor(updateFn: () => Promise<Set<T>>, staleTime = 1000 * 60 * 60 * 4) {
        this.#getData = updateFn
        this.staleTime = staleTime
    }
    setStaleFunction(fn: (fetchTime: number, staleTime: number) => boolean) {
        this.#isStaleFn = fn.bind(this)
        return this
    }
    async fetch() {
        if(this.isStale) this.set = await this.#getData()
        return this.set
    }
    get isStale() { 
        if(!this.set) return true
        if(this.#isStaleFn) return this.#isStaleFn(this.lastFetchTime, this.staleTime)
        else return Date.now() - this.lastFetchTime > this.staleTime
    }
}
let partitionRowCache: Map<number | undefined, DataCache> = new Map()
let lastMissingNameFetchTime = 0

let serverFilterCache: SetCache<string>
let partitionCache: SetCache<number>

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    serverFilterCache = new SetCache<string>(
        async () => {
            const [rows] = await fastify.db.query<RowDataPacket[]>(`SELECT DISTINCT server FROM ${ACTIVITY_LOG_TABLE_NAME} ORDER BY timestamp DESC`)
            const list: string[] = rows.filter(row => row.server).map(row => row.server)
            return new Set(list)
        }
    )
    partitionCache = new SetCache<number>(
        async () => {
            const [rows] = await fastify.db.query<RowDataPacket[]>(`SELECT YEAR(FROM_UNIXTIME(timestamp)) as year FROM left4dead2.activity_log GROUP BY YEAR(FROM_UNIXTIME(timestamp))`, [])
            if(rows.length === 0) return new Set([new Date().getFullYear()])
            return new Set(rows.map(row => Number(row.year)))
        }
    ).setStaleFunction((lastFetched, staleTime) => {
        // Partitions should only need to be updated once every year
        return new Date(lastFetched).getFullYear() > new Date().getFullYear()
    })

    const CurrentYear = () => new Date().getFullYear()

    const partitions = await partitionCache.fetch()
    async function getTotalRows(year: number | null): Promise<DataCache> {
        let value = partitionRowCache.get(year)
        // Fetch data if: (1) no cached data (2) if data is for this year/null and exceeds LOG_TOTAL_ROW_CACHE_TIME
        // Any other year, the data will never change.
        if(!value || (!year || year == CurrentYear()) && Date.now() - value.lastFetchTime > LOG_TOTAL_ROW_CACHE_TIME) {
            try {
                const [c] = await fastify.db.execute<RowDataPacket[]>(`SELECT COUNT(*) AS count, MAX(id) as highestId, MIN(id) as lowestId from ${ACTIVITY_LOG_TABLE_NAME} ${year != null ? `PARTITION (p${year})` : ''}`)
                value = {
                    totalRows: c[0].count,
                    highestId: c[0].highestId,
                    lowestId: c[0].lowestId,
                    lastFetchTime: Date.now()
                }
                partitionRowCache.set(year, value)
            } catch(err) {
                // Ignore invalid partitions
                if(err.code !== "ER_UNKNOWN_PARTITION") {
                    throw err
                }
            }
        }
        return value
    }
    // Fetch null to get the complete number of rows
    await getTotalRows(null)
    for await (const part of partitions) {
        getTotalRows(part)
    }

    fastify.get('/data', async(req, reply) => {
        const servers = await serverFilterCache.fetch()
        const partitions = Object.fromEntries(partitionRowCache)
        return {
            servers: [...servers],
            cache: partitions
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
            if(servers?.includes('web')) {
                // TODO: if .servers includes 'web', do AND type IN () OR server = 'web'
                // query.where('server', 'web')
                query.or([
                    ['server', '=', 'web']
                ])
            }
        }
        
        const startTime = Date.now()
        let [logs] = (await query.execute(fastify.db))

        let year = parseInt(req.query.source)
        if(!year || isNaN(year)) year = CurrentYear()
        let cache = await getTotalRows(year)
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

        const [rows] = await fastify.db.query<RowDataPacket[]>(`SELECT id, message, type, client FROM ${ACTIVITY_LOG_TABLE_NAME} WHERE id = ?`, [ req.params.id ])
        if(rows.length == 0) {
            return reply.code(404).send({
                error: "NOT_FOUND",
                message: `Could not find log id ${req.params.id}`
            })
        }

        if(rows[0].type === "CHAT" || (rows[0].type === "ACTION" && rows[0].message.includes("sm_chat"))) {
            if(rows[0].client === req.session.user.steamid) {
                fastify.log.info(`${req.session.user.steamid} has redacted message ${rows[0].message}`)

                await fastify.db.query(`UPDATE ${ACTIVITY_LOG_TABLE_NAME} SET message = '[redacted]' WHERE id = ?`, [ rows[0].id ])
        
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