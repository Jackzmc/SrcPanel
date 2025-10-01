import { join } from "path"
import { Database, open as sqliteOpen } from 'sqlite'
import sqlite3 from 'sqlite3';
import SQL from "sql-template-strings";
import { unixTimestamp } from "../util.js";

enum RecordType {
    Number = 0,
    Boolean,
    Text,
    Json
}

interface RecordRow {
    key: string,
    value: ValidType,
    type: number,
    updated_at: number
}

export type ValidType = number | string | object | boolean

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
                type = RecordType.Json
                value = JSON.stringify(value)
                break
            default:
                throw new Error("Unsupported type " + typeof(value))
        }
        this.#db.run(
            "INSERT OR REPLACE INTO cache (key,data,type,updated_at) VALUES (?,?,?,?)",
            [key, value, type, unixTimestamp()]
        )
    }

    async get<T extends ValidType>(key: string): Promise<T | null> {
        const entry = await this.getRawRecord(key)
        if(!entry) return null
        switch(entry.type) {
            case RecordType.Json:
                return JSON.parse(entry.value as string)
            case RecordType.Boolean:
                return Boolean(entry.value) as T
            default:
                return entry.value as T
        }
    }

    async getRawRecord(key: string): Promise<RecordRow | null> {
        return await this.#db.get<RecordRow>(key) ?? null
    }

    async isStale(key: string, maxExpires: number): Promise<boolean | null> {
        const entry = await this.getRawRecord(key) 
        return entry && unixTimestamp() - entry.updated_at >= maxExpires  
    }

    async delete(key: string) {
        await this.#db.run("DELETE FROM cache WHERE key = ?", [ key ])
    }
}