import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { NO_PERMISSION } from '../../responses.js';
import { QueryBuilder, SortDirection } from '../../modules/QueryBuilder.js';
import SteamID from 'steamid';
import { Pool } from 'mysql2/promise.js';
import logger from '../../logger.js'
import { APILogData, APILogQueryResult, LogEntry } from '@srcpanel/common/Logs';
import { TABLE_PREFIX } from '../../middlewares/managers.js';

const log = logger.child({ name: "logs" })

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

export const ACTIVITY_LOG_TABLE_NAME = 'activity_log'
// Only update partition's row cache (for latest year only) if its been under this long
const LOG_TOTAL_ROW_CACHE_TIME = 20_000 //ms
// Do not fetch if last fetch was between this
const MISSING_NAME_MIN_INTERVAL = 1000 * 20

// Cache data for partitions
let lastMissingNameFetchTime = 0

let ready = false

const currentYear = () => new Date().getFullYear()

interface PartitionData {
  minId: number,
  maxId: number,
  count?: number,
  fetchTime: number
}

// TODO: move all this init logic to core

// Default values, will fetch full data after

let availableServers = new Set(["web"])   // List of all distinct 'server' values

// Map of partitions to its min and max ids, and later count
let yearData: Map<number | null, PartitionData> = new Map()

/**
 * Fetches all distinct servers from all years
 * IS SLOW
 * @param pool
 * @returns
 */
async function fetchServers(pool: Pool): Promise<Set<string>> {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT DISTINCT server FROM activity_log ORDER BY timestamp DESC`)
  const list: string[] = rows.filter(row => row.server).map(row => row.server)
  for (const item of list) {
    availableServers.add(item)
  }
  return availableServers
}

/**
 * Fetches partitions, their lowest and highest ids, and the number of rows.
 * IS SLOW
 * @param pool
 * @returns
 */
async function getPartitions(pool: Pool): Promise<Map<number | null, PartitionData>> {
  console.time("getPartitions")
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT
        MAX(id) as highestId, MIN(id) as lowestId, COUNT(*) as count, YEAR(from_unixtime(timestamp)) year
        FROM activity_log
        GROUP BY year`
  )
  console.timeEnd("getPartitions")
  log.debug(rows)
  for (const row of rows) {
    yearData.set(row.year, {
      minId: row.lowestId,
      maxId: row.highestId,
      count: row.count,
      fetchTime: Date.now()
    })
  }
  console.log("resolved all partitions")
  return yearData
}

/**
 * Fetches min and max id for year, but not count. Is not slow like above functions
 * @param pool
 * @param year
 * @returns
 */
async function fetchYearDataQuick(pool: Pool, year: number): Promise<PartitionData> {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT MAX(id) as highestId, MIN(id) as lowestId 
    FROM activity_log
    WHERE timestamp >= ? AND timestamp < ?`,
    [
      Math.floor(new Date(`${year}-01-01T00:00:00`).getTime() / 1000),
      Math.floor(new Date(`${year + 1}-01-01T00:00:00`).getTime() / 1000)
    ]
  )
  const row = rows[0]
  const out = row && {
    minId: row.lowestId,
    maxId: row.highestId,
    fetchTime: Date.now()
  }
  yearData.set(year, out)
  return out
}

async function getYearData(pool: Pool, year: number) {
  let data = yearData.get(year)
  if (!data || Date.now() - data.fetchTime >= LOG_TOTAL_ROW_CACHE_TIME) {
    await getPartitions(pool)
    data = yearData.get(year)
  }
  return data
}

async function quickInit(fastify: FastifyInstance) {
  try {
    const cacheServers = await fastify.cache.get<typeof availableServers>("log.servers")
    const cachePartitions = await fastify.cache.get<typeof yearData>("log.partitions")
    if (cacheServers) availableServers = cacheServers
    if (cachePartitions) yearData = cachePartitions
    await fetchYearDataQuick(fastify.db, currentYear())
  } catch (err: any) {
    if (err.code === "ER_UNKNOWN_PARTITION") {
      log.warn({}, "quickInit: No partition for current year")
    } else {
      throw err
    }
  }
}

async function fetchFullData(fastify: FastifyInstance) {
  log.debug("START FETCH FULL")
  await Promise.allSettled([
    fetchServers(fastify.db),
    getPartitions(fastify.db)
  ])

  log.debug("END FETCH FULL")
  ready = true

  await fastify.cache.set("logs.partitions", yearData)
  await fastify.cache.set("logs.servers", availableServers)
}

const ADMIN_CHAT_REGEX = new RegExp(/triggered (sm_say|sm_chat) \(text (.*)\)/)

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  // Quick initalize
  await quickInit(fastify)
  // Don't wait for full data to resolve
  fetchFullData(fastify)

  fastify.get('/data', async (req, reply): Promise<APILogData> => {
    // update data
    await getYearData(fastify.db, currentYear())

    const years: Record<number, PartitionData> = Object.fromEntries(yearData.entries());
    const computedTotal = Object.values(years).reduce((pv, cv) => (cv.count ?? 0) + pv, 0)
    return {
      servers: [...availableServers],
      years,
      computedTotal,

      fullyLoaded: ready
    }
  })

  const VALID_TYPES = ["before", "after", "around"]
  fastify.get('/:type/:id', async (req: FastifyRequest<{ Querystring: LogQueryType, Params: { type: string, id: number } }>, reply): Promise<APILogQueryResult> => {
    if (!ready) return reply.status(503).send({
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
      // if (servers?.includes('web')) {
      //   // TODO: if .servers includes 'web', do AND type IN () OR server = 'web'
      //   // query.where('server', 'web')
      //   query.or([
      //     ['server', '=', 'web']
      //   ])
      // }
    }

    const startTime = Date.now()
    console.log(query.buildUnsafe())
    const [rawLogs] = (await query.execute(fastify.db))

    let year = parseInt(req.query.source as string)
    if (!year || isNaN(year)) year = currentYear()
    const yearInfo = await getYearData(fastify.db, year)
    const missingNameSet = new Set<SteamID>()

    const logs = rawLogs.map(log => {
      if (log.metadata) log.metadata = JSON.parse(log.metadata)
      // If its a valid user but no name, then put it in a list to be updated:
      if (!log.clientName && log.client?.startsWith("STEAM_")) {
        missingNameSet.add(new SteamID(log.client))
      }
      if (!log.targetName && log.target?.startsWith("STEAM_")) {
        missingNameSet.add(new SteamID(log.target))
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
    // If we have missing names, fetch it in bulk (only every MISSING_NAME_MIN_INTERVAL ms)
    if (missingNameSet.size > 0 && Date.now() - lastMissingNameFetchTime > MISSING_NAME_MIN_INTERVAL) {
      try {
        const newNames = await fastify.users.fetchUsers([...missingNameSet])
        const nameRecord: Record<string, string> = {}
        // Push the array into a record
        for (const user of newNames) {
          nameRecord[user.accountId] = user.name
        }
        // Iterate logs and replace
        // TODO: this is failing to find and replace
        for (const log of logs) {
          if (log.client && !log.clientName) {
            log.clientName = nameRecord[log.client.slice(10)]
          }
          if (log.target && !log.targetName) {
            log.targetName = nameRecord[log.target.slice(10)]
          }
        }
        lastMissingNameFetchTime = Date.now()
      } catch (err: any) {
        fastify.log.warn(`[logs] Could not fetch missing names (${[...missingNameSet].toString()}):`, err)
      }
    }

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
    if (!req.params.id) {
      return reply.code(404).send({
        error: "NOT_FOUND",
        message: `Could not find log id ${req.params.id}`
      })
    }

    const [rows] = await fastify.db.query<RowDataPacket[]>(`SELECT id, message, type, client FROM ${ACTIVITY_LOG_TABLE_NAME} WHERE id = ?`, [req.params.id])
    if (rows.length == 0) {
      return reply.code(404).send({
        error: "NOT_FOUND",
        message: `Could not find log id ${req.params.id}`
      })
    }

    if (rows[0].type === "CHAT" || (rows[0].type === "ACTION" && rows[0].message.includes("sm_chat"))) {
      if (rows[0].client === req.session.user.steamid) {
        fastify.log.info(`${req.session.user.steamid} has redacted message ${rows[0].message}`)

        await fastify.db.query(`UPDATE ${ACTIVITY_LOG_TABLE_NAME} SET message = '[redacted]' WHERE id = ?`, [rows[0].id])

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
