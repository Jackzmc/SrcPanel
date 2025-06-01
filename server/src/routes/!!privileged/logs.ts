import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { NO_PERMISSION } from '../../responses.js';
import { QueryBuilder, SortDirection } from '../../modules/QueryBuilder.js';
import SteamID from 'steamid';
import { open } from 'sqlite';
import SetCacheManager, { SetCache } from '../../modules/SetCache.js';
import { CronJob } from 'cron'

const LogQuery = Type.Object({
    raw: Type.Optional(Type.Boolean({default: false})),
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
// Only update partition's row cache (for latest year only) if its been under this long
const LOG_TOTAL_ROW_CACHE_TIME = 20_000 //ms
// Do not fetch if last fetch was between this
const MISSING_NAME_MIN_INTERVAL = 1000 * 20 

interface DataCache {
    totalRows: number,
    highestId: number,
    lowestId: number,
    lastFetchTime: number
}

// Cache data for partitions
let partitionRowCache: Map<number | null, DataCache> = new Map()
let lastMissingNameFetchTime = 0

let serverFilterCache: SetCache<string>
let partitionCache: SetCache<number>

let ready = false

// TODO: fix very slow query, resolve in cron job? or have a cache table?
async function init(fastify: FastifyInstance) {
    await SetCacheManager.Load()
    // Set of all server column values in activity log table
    serverFilterCache = new SetCache<string>(
        async () => {
            const [rows] = await fastify.db.query<RowDataPacket[]>(`SELECT DISTINCT server FROM ${ACTIVITY_LOG_TABLE_NAME} ORDER BY timestamp DESC`)
            const list: string[] = rows.filter(row => row.server).map(row => row.server)
            return new Set(list)
        }
    ).setDiskCacheKey("servers")
    // Set of all partitions for activity log table
    partitionCache = new SetCache<number>(
        async () => {
            const [rows] = await fastify.db.query<RowDataPacket[]>(`SELECT YEAR(FROM_UNIXTIME(timestamp)) as year FROM left4dead2.activity_log GROUP BY YEAR(FROM_UNIXTIME(timestamp))`, [])
            if(rows.length === 0) return new Set([new Date().getFullYear()])
            return new Set(rows.map(row => Number(row.year)))
        }
    ).setStaleFunction((lastFetched, staleTime) => {
        // Partitions should only need to be updated once every year
        return new Date(lastFetched).getFullYear() > new Date().getFullYear()
    }).setDiskCacheKey("partitions")

    // Calculates current year in YYYY
    const CurrentYear = () => new Date().getFullYear()

    async function getTotalRows(year: number | null): Promise<DataCache|undefined> {
        let value = partitionRowCache.get(year)
        // Fetch data if: 
        //  (1) no cached data 
        //  (2) if data is for this year or total rows (null) and exceeds LOG_TOTAL_ROW_CACHE_TIME
        // Any other year, the data will/should never change, as its old data.
        if(!value || (!year || year == CurrentYear()) && Date.now() - value.lastFetchTime > LOG_TOTAL_ROW_CACHE_TIME) {
            try {
                // console.log(`SELECT COUNT(*) AS count, MAX(id) as highestId, MIN(id) as lowestId from ${ACTIVITY_LOG_TABLE_NAME} ${year != null ? `PARTITION (p${year})` : ''}`)
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
    return {
        getTotalRows,
        CurrentYear,
        serverFilterCache,
        partitionCache
    }
}

async function load(fastify: FastifyInstance, { getTotalRows, CurrentYear }) {
    // Fetch null to get the complete number of rows
    await getTotalRows(null)
    const partitions = await partitionCache.fetch()
    const a = await Promise.all([...partitions.values()].map(part => getTotalRows(part)))
    await SetCacheManager.Save()

    // Add new partition on new year
    new CronJob(
        '0 0 1 1 *', // cronTime
        async function () {
            const year = CurrentYear() 
            fastify.log.info("Adding partition to activity_log for " + year)
            await fastify.db.execute(`ALTER TABLE activity_log ADD PARTITION ( PARTITION p${year} VALUES LESS THAN ( UNIX_TIMESTAMP('${year+1}-01-01 00:00') ) )`)
        }, // onTick
        null, // onComplete
        true, // start
    );

    ready = true
    fastify.log.info("Logs: Ready")
    return {
        getTotalRows
    }
}


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    const data = await init(fastify)
    const { getTotalRows, CurrentYear } = data
    // do not wait for data:
    load(fastify, data)

    fastify.get('/data', async(req, reply) => {
        if(!ready) return reply.status(503).send({
            error: "NOT_READY",
            message: "Logs is not yet ready, try again later"
        })
        const servers = await serverFilterCache.fetch()
        // make sure the latest year and all row data is always up to date and force refresh:
        await getTotalRows(null)
        await getTotalRows(CurrentYear())

        const partitions = Object.fromEntries(partitionRowCache)
        return {
            servers: [...servers],
            cache: partitions
        }
    })

    const VALID_TYPES = ["before","after","around"]
    fastify.get('/:type/:id', async (req: FastifyRequest<{ Querystring: LogQueryType, Params: { type: string, id: number}}>, reply) => {
        if(!ready) return reply.status(503).send({
            error: "NOT_READY",
            message: "Logs is not yet ready, try again later"
        })
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
            .select("s1.last_name", "clientName")
            .select("s2.last_name", "targetName")
            .leftJoin("view_panel_user", "account_id", "=", "SUBSTRING(client, 11)", "s1", true)
            .leftJoin("view_panel_user", "account_id", "=", "SUBSTRING(target, 11)", "s2", true)
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

        let year = parseInt(req.query.source as string)
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
            if(cache && log.id > cache.highestId) {
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
                    nameRecord[user.accountId] = user.name
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
                total: cache?.totalRows, // # of rows in entire data source
                count: logs.length // # of rows + filtered + pagination (<= limit)
            },
            // pages: Math.ceil(count[0].count / limit),
            raw: process.env.NODE_ENV === "production" || req.query.raw ? null : {
                cache: cache ? cache[tableName] : undefined,
                query: query.buildUnsafe(),
                tableName
            }
        }
    })

    fastify.post("/:id/redact", async(req: FastifyRequest<{Params: {id: 'string'}}>, reply) => {
        if(!req.user!.hasPermission("logs.redact")) return NO_PERMISSION(reply)
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