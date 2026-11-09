import Logger, { PinoLogger } from '#/util/logger.js'
import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import CacheManager from '../CacheManager.js'
import type User from '../users/User.js'
import type { LogData } from '../users/User.js'
import * as Repo from './LogsRepo.js'
import type { DBClient } from '../../core/database.js'
import type { LogEntry, YearInfo } from '@srcpanel/common/Logs'

export const ACTIVITY_LOG_TABLE_NAME = "activity_log"

const LOG_TOTAL_ROW_CACHE_TIME = 20_000

interface PartitionDataCache extends Repo.PartitionData {
  fetchTime: number
}

export interface GetLogsResult {
    logs: LogEntry[],
    totalFilteredRows: number,
    yearInfo: YearInfo
}

export default class LogsManager {
    #pool: Pool
    #log: PinoLogger
    #cache: CacheManager

    // List of all distinct 'server' values
    #availableServers: Set<string> = new Set(["web"])

    // Map of partitions to its min and max ids, and later count
    #yearData: Map<number, PartitionDataCache> = new Map()

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

    get yearData(): Record<number, PartitionDataCache> {
        return Object.fromEntries(this.#yearData.entries());
    }

    /** The absolute total nubmer of rows in table */
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
        const servers = await Repo.getDistinctServers(this.#pool)
        servers.forEach(row => this.#availableServers.add(row))
        return this.#availableServers
    }

    /**
     * Fetches partitions, their lowest and highest ids, and the number of rows.
     * IS SLOW
     * @param pool
     * @returns
     */
    async getPartitions(): Promise<Map<number, PartitionDataCache>> {
        const startTime = performance.now()
        const partitions = await Repo.getPartitionData(this.#pool)
        this.#log.debug({ duration_ms: performance.now() - startTime }, "getPartitions")
        for (const row of partitions) {
            this.#log.debug({ row }, "row")
            this.#yearData.set(row.year, {
                ...row,
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

    /**
     * Creates a new partition in the database for the specific year. Skips if one already exists for year.
     * @param year the year to add partition for
     */
    async addPartitionForYear(year: number) {
        const nextYear = year + 1

        try {
            // Check if we need to add a partition
            const partitions = await Repo.getPartitionNames(this.#pool)
            // Maybe not the best check but it should work
            const hasYear = partitions.some(part => parseInt(part.PARTITION_NAME.substring(1)) === year)
            if(!hasYear) {
                await Repo.addPartition(this.#pool, year, nextYear)
                this.#log.info({ year }, `Added new partition to activity log`)
            }
        } catch(err) {
            this.#log.warn({ year, err }, "failed to add new partition for year")
        }
    }

    /**
     * Redacts a specific log entry by setting its message to ['redacted']
     * @param id 
     */
    async redactId(id: number) {
        Repo.redactId(this.#pool, id)
    }
    
    /**
     * Gets a specific log entry.
     * @param id 
     * @returns 
     */
    async getLog(id: number): Promise<LogEntry | null> {
        return Repo.getLogEntry(this.#pool, id)
    }

    /**
     * Fetches logs in 'before' an id (inclusive), 'after' an id (exclusive), or around an id (id's entry in the center). 
     * @param type either 'before', 'after', or 'around'
     * @param id the id to use for direction
     * @param options other options such as limit and filters
     * @returns a tuple of [an array of log entries, the info about the specific year's data range]
     */
    async fetchLogs(type: "before" | "after" | "around", id: number, options: Repo.FetchLogOptions = {}): Promise<GetLogsResult>  {
        const [ logs, totalFilteredRows ] = await Repo.fetchLogs(this.#pool, type, id, options)

        // Update cached data incase we get new logs
        if (!options.year) options.year = this.currentYear
        const yearInfo = await this.getYearData(options.year)
        if(!yearInfo) throw new Error("no year info")
        logs.forEach(log => {
            yearInfo.maxId = Math.max(yearInfo.maxId, log.id)
        })
        this.#yearData.set(options.year, yearInfo)
            
        return {
            logs, 
            yearInfo, 
            totalFilteredRows
        }
    }

    /**
     * Fetches logs after a given id
     * @param id defaults to the last known log entry
     * @param options other options such as limit and filters
     * @returns a tuple of [an array of log entries, the info about the specific year's data range]
     */
    async fetchLogsAfter(id?: number | null, options: Repo.FetchLogOptions = {}): Promise<GetLogsResult> {
        if(!id) {
            const year = await this.getYearData(this.currentYear)
            if(!year) throw new Error("missing year data")
            id = year.maxId
        }
        return await this.fetchLogs("after", id, options)
    }

    /**
     * Logs that an action happened on the panel
     * @param activator the user who performed the action
     * @param target if any, the user this action was performed against
     * @param message a message
     * @param payload extra data
     * @returns id of entry
     */
    async logWeb(activator: User, target?: User|null, message?: string, payload?: LogData): Promise<number> {
        let msg: string|null = null
        if(message) {
            msg = (message || "")
                .replace(/%client%/g, `"${await activator.name() ?? "Activator"}<0><${activator.steamid2}><>"`)
            if(target) msg = msg.replace(/%target%/g, `"${await target.name() ?? "Target"}<0><${target.steamid2}><>"`)
        }
        
        // Legacy
        let permission:string|null = null
        if(payload) {
            if('code' in payload) permission = payload.code
            else if('type' in payload) permission = payload.type
        }

        const metadata = payload?.metadata ?? {}
        metadata.permission = permission

        const id = await Repo.addLogEntry(this.#pool, 'web', 'web', activator.steamid2, target?.steamid2 ?? null, msg, metadata)

        return id
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

            const cachePartitions = await this.#cache.get<Map<number,PartitionDataCache>>("log.partitions")
            if (cachePartitions) this.#yearData = cachePartitions
        } catch(err) {
            this.#log.warn({ err }, "failed to load cache")
        }
    }
    
}
