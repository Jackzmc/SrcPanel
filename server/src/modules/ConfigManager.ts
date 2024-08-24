import sqlite3 from 'sqlite3'
import sqlite, { open } from 'sqlite'
import SQL from 'sql-template-strings';
import { join } from 'path';
import { KeyFlags, ConfigKey, KVConfig, PublicKeys } from '../../../common-types/Panel.js';

export interface RegisteredProvider {
    id: string
    name?: string,
}

export default class ConfigManager {
    #db: sqlite.Database<sqlite3.Database, sqlite3.Statement>
    #servers: any[] = null

    public async Load(dataDir: string) {
        this.#db = await open({
            filename: join(dataDir, "config.db"),
            driver: sqlite3.Database
        })
        await this.SetupDatabase()
    }

    public async SetupDatabase() {
        const check = await this.#db.get("SELECT count(*) as setup FROM sqlite_master WHERE type='table' AND name='keyvalues'")
        if(!check.setup) {
            console.info("[ConfigManager] Keyvalues table does not exist, creating...")
            await this.#db.run(SQL`create table if not exists keyvalues
            (
                key varchar(64) not null,
                value smalltext not null,
                constraint keyvalues_pk
                    primary key (key)
            );`)
            await this.#db.run(SQL`INSERT INTO keyvalues (key, value) VALUES ('domain', 'http://localhost:8080')`)
        }
        await this.checkRequiredKeys()
    }
    public async GetPublicKeyvalues() {
        let kv = {}
        for(const key of PublicKeys) {
            kv[key] = await this.GetKV(key, null)
        }
        return kv
    }

    public async FindProviders() {
        const providers: RegisteredProvider[] = []
        const data: {key: string}[] = await this.#db.all(SQL`SELECT SUBSTRING(key,11) as key FROM keyvalues WHERE key LIKE "providers.%"`)
        for(const row of data) {
            const provider = row.key.split(".").shift()
            if(!providers.some(p => p.id === provider)) {
                const name = await this.GetKVNamespaced("providers", provider, "name")
                providers.push({
                    id: provider,
                    name: name ?? provider
                })
            }
        }
        return providers
    }

    /**
     * Returns a list of all keys from a parent. 
     * @example GetKVChildren("policy") will return "policy.X", "policy.YYY.ZZ", etc..
     * @param parents list of parents, like KVNamespaced
     * @returns list of { key, value }
     */
    public async GetKVChildren(...parents: string[]): Promise<{key: string, value: string}[]> {
        const data = await this.#db.all(SQL`SELECT key, value FROM keyvalues WHERE key LIKE '${parents.join(".")}.%'`)
        return data
    }

    public async GetKV<T extends number | string | boolean = string>(key: ConfigKey, defaultValue?: T): Promise<T> {
        const data = await this.#db.get(SQL`SELECT value FROM keyvalues WHERE key = ${key}`)
        const config = KVConfig[key]
        if(!data) return defaultValue
        if(config) {
            switch(config.type) {
                case "float": return parseFloat(data) as T
                case "integer": return parseInt(data) as T
                case "boolean": return Boolean(data) as T
            }
        }
        return data.value as T ?? defaultValue
    }

    public async GetKVNamespaced<T extends number | string = string>(...args: string[]): Promise<T> {
        return this.GetKV(args.join(".") as ConfigKey, null)
    }

    public async HasKV(key: ConfigKey) {
        return await this.GetKV(key) != undefined 
    }

    public async SetKV(key: ConfigKey, value: string | number) {
        if(value == null || value == undefined) await this.deleteKV(key)
        else await this.#db.run(SQL`REPLACE INTO keyvalues (key, value) VALUES (${key}, ${value})`)
    }
    /**
     * Similar to GetKVNamespaced, but the key must be in its own array
     * @param args 
     */
    public async SetKVNamespaced(key: string[], value: string | number) {
        const dbKey = key.join(".") as ConfigKey
        if(value == null || value == undefined) await this.deleteKV(dbKey)
        else await this.#db.run(SQL`REPLACE INTO keyvalues (key, value) VALUES (${dbKey}, ${value})`)
    }

    private async deleteKV(key: ConfigKey) {
        await this.#db.run(SQL`DELETE FROM keyvalues WHERE key = ${key}`)
    }

    private async checkRequiredKeys() {
        const missing = []
        for(const [key, data] of Object.entries(KVConfig)) {
            if(data.flags & KeyFlags.Required) {
                if(!await this.HasKV(key as ConfigKey)) {
                    missing.push(key)
                }
            }
        }

        if(missing.length > 0) {
            console.warn(`[ConfigManager] WARNING: Missing ${missing.length} required configurations:`)
            for(const key of missing) {
                if(KVConfig[key].description)
                    console.warn(`  ${key} [${KVConfig[key].type}] - ${KVConfig[key].description}`)
                else
                    console.warn(`  ${key} [${KVConfig[key].type}]`)

            }
        }

    }
}