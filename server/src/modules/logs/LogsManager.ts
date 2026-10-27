import Logger, { PinoLogger } from '#/logger.js'
import { Pool, RowDataPacket } from 'mysql2/promise'
import CacheManager from '../CacheManager.js'

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
    #yearData: Map<number | null, PartitionData> = new Map()

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
        return Object.values(this.#yearData).reduce((pv, cv) => (cv.count ?? 0) + pv, 0)
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
    async getPartitions(): Promise<Map<number | null, PartitionData>> {
        
        console.time("getPartitions")
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
        console.timeEnd("getPartitions")
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
            this.#log.debug({ }, "no year data or stale, fetching fresh data")
            await this.getPartitions()
            data = this.#yearData.get(year)
        }
        return data
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

            const cachePartitions = await this.#cache.get<Map<number|null,PartitionData>>("log.partitions")
            if (cachePartitions) this.#yearData = cachePartitions
        } catch(err) {
            this.#log.warn({ err }, "failed to load cache")
        }
    }
}