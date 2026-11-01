import Logger, { PinoLogger } from '#/logger.js'
import { Pool, RowDataPacket } from 'mysql2/promise'
import CacheManager from '../CacheManager.js'
import PlayerManager from '../users/PlayerManager.js'
import SteamID from 'steamid'
import { LogEntry } from '@srcpanel/common/Logs'

export const ACTIVITY_LOG_TABLE_NAME = "activity_log"

const LOG_TOTAL_ROW_CACHE_TIME = 20_000

interface PartitionData {
  minId: number,
  maxId: number,
  count?: number,
  fetchTime: number
}

export default class LogsManager {
    #pool: Pool
    #log: PinoLogger
    #cache: CacheManager

    // List of all distinct 'server' values
    #availableServers: Set<string> = new Set(["web"])

    // Map of partitions to its min and max ids, and later count
    #yearData: Map<number, PartitionData> = new Map()

    #ready = false

    constructor(pool: Pool, cache: CacheManager) {
        this.#log = Logger.child({ name: "Logs" })
        this.#pool = pool
        this.#cache = cache
    }

    static async create(pool: Pool, cache: CacheManager) {
        const logs = new LogsManager(pool, cache)
        await logs.loadCache()
        
        logs.lazyLoad()
        return logs
    }

    async onShutdown() {
        await this.saveCache()
    }

    get currentYear(): number {
        return new Date().getFullYear()
    }

    get servers(): string[] {
        return [...this.#availableServers.values()]
    }

    get yearData(): Record<number, PartitionData> {
        return Object.fromEntries(this.#yearData.entries());
    }

    get totalRows(): number {
        return Object.values(this.yearData)
            .reduce((pv, cv) => (cv.count ?? 0) + pv, 0)
    }

    get loaded() {
        return this.#ready
    }

    async lazyLoad() {
        try {
            await Promise.all([
                this.getPartitions(),
                this.fetchServers()
            ])
            this.#log.info({}, "ready")
        } catch(err) {
            this.#log.error({ err }, "lazy load error")
        }
    }
    
    /**
     * Fetches all distinct servers from all years
     * @returns
     */
    async fetchServers(): Promise<Set<string>> {
        const [rows] = await this.#pool.query<RowDataPacket[]>(`
            SELECT DISTINCT server FROM activity_log
            WHERE server IS NOT NULL
            ORDER BY timestamp DESC
        `)
        rows.forEach(row => this.#availableServers.add(row.server))
        return this.#availableServers
    }

    /**
     * Fetches partitions, their lowest and highest ids, and the number of rows.
     * IS SLOW
     * @param pool
     * @returns
     */
    async getPartitions(): Promise<Map<number, PartitionData>> {
        const startTime = performance.now()
        const [rows] = await this.#pool.query<RowDataPacket[]>(`
            SELECT
                MIN(id) as lowestId, 
                MAX(id) as highestId, 
                COUNT(*) as count, 
                YEAR(from_unixtime(timestamp)) year
            FROM activity_log
            GROUP BY year
            ORDER BY year
        `)
        this.#log.debug({ duration_ms: performance.now() - startTime }, "getPartitions")
        for (const row of rows) {
            this.#yearData.set(row.year, {
                minId: row.lowestId,
                maxId: row.highestId,
                count: row.count,
                fetchTime: Date.now()
            })
        }
        this.#log.debug({}, "resolved all partitions")
        this.#ready = true
        return this.#yearData
    }

    /** Updates current year data if stale or missing */
    async updateCurrentYear() {
        await this.getYearData(this.currentYear)
    }

    /** Get fresh year data  */
    async getYearData(year: number) {
        let data = this.#yearData.get(year)
        if (!data || Date.now() - data.fetchTime >= LOG_TOTAL_ROW_CACHE_TIME) {
            this.#log.debug({ year }, "no year data or stale, fetching fresh data")
            await this.getPartitions()
            data = this.#yearData.get(year)
        }
        return data
    }

    async addPartitionForYear(year: number) {
        const nextYear = year

        try {
            // Check if we need to add a partition
            const [partitions] = await this.#pool.query<RowDataPacket[]>(`
            SELECT * FROM information_schema.partitions
                WHERE TABLE_SCHEMA='left4dead2'
                AND TABLE_NAME = 'activity_log'
                AND PARTITION_NAME IS NOT NULL
                ORDER BY PARTITION_DESCRIPTION
                LIMIT 1`
            )
            // Maybe not the best check but it should work
            const hasYear = partitions.some(part => parseInt(part.PARTITION_NAME.substring(1)) === year)
            if(!hasYear) {
                await this.#pool.query(`
                    ALTER TABLE activity_log ADD PARTITION IF NOT EXISTS
                    ( PARTITION p${year} VALUES LESS THAN ( UNIX_TIMESTAMP('${nextYear}-01-01 00:00') ) )`
                )
                this.#log.info({ year }, `Added new partition to activity log`)
            }
        } catch(err) {
            this.#log.warn({ year, err }, "failed to add new partition for year")
        }
    }

    async redactId(id: number) {
        await this.#pool.query(`
            UPDATE ${ACTIVITY_LOG_TABLE_NAME} 
            SET message = '[redacted]' 
            WHERE id = ?`, 
            [ id ]
        )
    }

    async getLog(id: number): Promise<{ id: number, message: string, type: string, client: string } | null> {
        const [rows] = await this.#pool.query<RowDataPacket[]>(
            `SELECT id, message, type, client 
            FROM ${ACTIVITY_LOG_TABLE_NAME} 
            WHERE id = ?`, 
            [ id ]
        )

        return rows.length > 0 ? rows[0] as ReturnType<typeof this.getLog> : null
    }

    async saveCache() {
        try {
            await this.#cache.set("logs.partitions", this.#yearData)
            await this.#cache.set("logs.servers", this.#availableServers)
        } catch(err) {
            this.#log.warn({ err }, "failed to save cache")
        }
    }

    async loadCache() {
        try {
            const cacheServers = await this.#cache.get<Set<string>>("log.servers")
            if (cacheServers) this.#availableServers = cacheServers

            const cachePartitions = await this.#cache.get<Map<number,PartitionData>>("log.partitions")
            if (cachePartitions) this.#yearData = cachePartitions
        } catch(err) {
            this.#log.warn({ err }, "failed to load cache")
        }
    }
    
}

const ADMIN_CHAT_REGEX = new RegExp(/triggered (sm_say|sm_chat) \(text (.*)\)/)

export function formatLogEntry(log: any): LogEntry {
    if (log.metadata) log.metadata = JSON.parse(log.metadata)
    // If its a valid user but no name, then put it in a list to be updated:
    if (!log.clientName && log.client?.startsWith("STEAM_")) {
        PlayerManager.instance.enqueueNameResolve(new SteamID(log.client))
    }
    if (!log.targetName && log.target?.startsWith("STEAM_")) {
        PlayerManager.instance.enqueueNameResolve(new SteamID(log.target))
    }
    // Admin chats are performed via sm_say / sm_chat commands
    // So we detect that, grab the message and mark it as actually 'CHAT'
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
}