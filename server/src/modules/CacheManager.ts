import { join } from "path"
import { Database, open as sqliteOpen } from 'sqlite'
import sqlite3 from 'sqlite3';
import SQL from "sql-template-strings";
import { unixTimestamp } from "../util.js";
import Logger from '../logger.js'
const log = Logger.child({ name: "cache" })

enum RecordType {
    Number = 0,
    Boolean,
    Text,
    Json,
    Set,
    Map
}

interface RecordRow {
    key: string,
    data: ValidType,
    type: number,
    updated_at: number,
    expires_at: number
}

export interface RecordOptions {
    /** How many seconds until this record should expire */
    ttl?: number
}

export type ValidType = number | string | object | boolean | Map<any, any> | Set<any>
type DatabaseType = Database<sqlite3.Database, sqlite3.Statement>

/**
 * A persistent keyvalue cache manager, supporting saving Maps, Sets, JSON, booleans directly 
 *
 * @export
 * @class CacheManager
 */
export default class CacheManager {
    #db: DatabaseType;
    constructor(db: Database) {
        this.#db = db
    }

    static async Create(cacheFolder: string): Promise<CacheManager> {
        const filepath = join(cacheFolder, 'cache.db')
        log.debug({ filepath }, "cache path")
        const db = await this.#openDb(filepath)
        await this.#initDb(db)
        return new CacheManager(db)
    }

    static async #openDb(filepath: string): Promise<DatabaseType> {
        try {
            const db = await sqliteOpen({
                filename: filepath,
                driver: sqlite3.Database
            })
            return db
        } catch(err) {
            throw new Error(`Failed to load cache ${filepath}`, { cause: err })
        }
    }

    static async #initDb(db: DatabaseType) {
        try {
            await db.exec(SQL`CREATE TABLE IF NOT EXISTS cache (
                key TEXT NOT NULL,
                data TEXT NOT NULL,
                type INT NOT NULL,
                updated_at INT NOT NULL,
                expires_at INT,
                PRIMARY KEY(key)
            );`);
        } catch(err) {
            throw new Error(`Failed to run database initalization scripts`, { cause: err })
        }
    }

    
    /**
     * Sets a key to value. The value will persist restarts.  Supports Map, Set, Boolean, Json, and number/string
     *
     * @param {string} key
     * @param {ValidType} value
     * @param {RecordOptions} options any extra options to set
     * @return {*}  {Promise<void>}
     */
    async set(key: string, value: ValidType, options: RecordOptions = {}): Promise<void> {
        let type: RecordType
        switch(typeof value) {
            case "number":
                type = RecordType.Number
                break
            case "boolean":
                type = RecordType.Boolean
                value = Number(value)
                break
            case "string":
                type = RecordType.Text
                break
            case "object":
                if(value instanceof Set) {
                    type = RecordType.Set
                    value = JSON.stringify([...value])
                } else if(value instanceof Map) {
                    type = RecordType.Map
                    value = JSON.stringify(Object.fromEntries(value.entries())) // convert map to any obj then serialize
                } else {
                    type = RecordType.Json
                    // stringify - with support of Set -> []
                    value = JSON.stringify(value, (_key, value) => (value instanceof Set ? [...value] : value))
                }
                break
            default:
                throw new Error("Unsupported type " + typeof(value))
        }

        const expiresAt = options.ttl ? unixTimestamp() + options.ttl : null

        this.#db.run(
            "INSERT OR REPLACE INTO cache (key,data,type,updated_at,expires_at) VALUES (?,?,?,?,?)",
            [key, value, type, unixTimestamp(), expiresAt]
        )
    }

    /**
     * Returns the raw unprocessed value of the specified key
     *
     * @param {string} key
     * @return {*}  {(Promise<RecordRow | null>)}
     */
    async getRawRecord(key: string): Promise<RecordRow | null> {
        const row = await this.#db.get<RecordRow>("SELECT * FROM cache WHERE key = ?", [ key ]) ?? null

        // Check if record expired
        if(row && row.expires_at >= unixTimestamp()) {
            await this.delete(row.key)
            return null
        }

        return row
    }

    
    /**
     * Returns the value of specified key. Supports Map, Set, Boolean, Json, and number/string
     *
     * @template T
     * @param {string} key
     * @return {*}  {(Promise<T | null>)}
     */
    async get<T extends ValidType>(key: string): Promise<T | null> {
        const entry = await this.getRawRecord(key)
        log.debug({ key, type: entry?.type, updated: entry?.updated_at }, "get")
        if(!entry) return null
        switch(entry.type) {
            case RecordType.Map: {
                const json = JSON.parse(entry.data as string)
                return new Map(Object.entries(json)) as T
            }
            case RecordType.Set: {
                const json = JSON.parse(entry.data as string)
                return new Set(json) as T
            }
            case RecordType.Json:
                return JSON.parse(entry.data as string)
            case RecordType.Boolean:
                return Boolean(entry.data) as T
            default:
                return entry.data as T
        }
    }

    async delete(key: string) {
        await this.#db.run("DELETE FROM cache WHERE key = ?", [ key ])
    }
}