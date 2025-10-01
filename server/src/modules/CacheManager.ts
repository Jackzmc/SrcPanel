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
    updated_at: number
}

export type ValidType = number | string | object | boolean | Map<any, any> | Set<any>

export default class CacheManager {
    #db: Database<sqlite3.Database, sqlite3.Statement>;
    constructor(db: Database) {
        this.#db = db
    }

    static async Create(cacheFolder: string): Promise<CacheManager> {
        const filename = join(cacheFolder, 'cache.db')
        try {
            const db = await sqliteOpen({
                filename,
                driver: sqlite3.Database
            })
            await db.exec(SQL`CREATE TABLE IF NOT EXISTS cache (
                key TEXT NOT NULL,
                data TEXT NOT NULL,
                type INT NOT NULL,
                updated_at INT NOT NULL,
                PRIMARY KEY(key)
            );`)
            return new CacheManager(db)
        } catch(err) {
            throw new Error(`Failed to initalize cache at ${filename}`, { cause: err })
        }
    }

    async set(key: string, value: ValidType): Promise<void> {
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
        log.debug({ key, type }, "set")
        this.#db.run(
            "INSERT OR REPLACE INTO cache (key,data,type,updated_at) VALUES (?,?,?,?)",
            [key, value, type, unixTimestamp()]
        )
    }

    async getRawRecord(key: string): Promise<RecordRow | null> {
        return await this.#db.get<RecordRow>("SELECT * FROM cache WHERE key = ?", [ key ]) ?? null
    }

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

    async isStale(key: string, maxExpires: number): Promise<boolean | null> {
        const entry = await this.getRawRecord(key) 
        return entry && unixTimestamp() - entry.updated_at >= maxExpires  
    }

    async delete(key: string) {
        await this.#db.run("DELETE FROM cache WHERE key = ?", [ key ])
    }
}