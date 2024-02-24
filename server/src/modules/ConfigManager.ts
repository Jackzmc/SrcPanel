import sqlite3 from 'sqlite3'
import sqlite, { open } from 'sqlite'
import SQL from 'sql-template-strings';
import { join } from 'path';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import Json5 from 'json5'
import { ShareDestination, ShareInfo } from '../../../common-types/Share';
import Share from './Share';
import { Keyvalue, Keyvalues, PublicKeys } from '../../../common-types/Panel.js';

export interface RegisteredProvider {
    id: string
    name?: string,
}

export default class ConfigManager {
    private db: sqlite.Database<sqlite3.Database, sqlite3.Statement>
    private _servers: any[] = null
    private dataDir: string

    public async Load(dataDir: string) {
        this.dataDir = dataDir
        this.db = await open({
            filename: join(dataDir, "config.db"),
            driver: sqlite3.Database
        })
        await this.SetupDatabase()
    }

    public async SetupDatabase() {
        await this.db.run(SQL`create table if not exists shares
        (
            id               varchar(32)   not null,
            name             varchar(64)   null,
            source_folder    TINYTEXT      not null,
            steam_appid      int           null,
            valid_exts       varchar(255)  null,
            download_sources int default 0 not null,
            constraint shares_pk
                primary key (id)
        );`)
        await this.db.run(SQL`create table if not exists share_dests
        (
            share_id varchar(32) not null,
            id       varchar(32) not null,
            name     tinytext    null,
            path     tinytext    not null,
            server_ids smalltext null,
            constraint share_dests_pk
                primary key (id),
            constraint share_dests_shares_id_fk
                foreign key (share_id) references shares (id)
        );`)
        await this.db.run(SQL`create table if not exists keyvalues
        (
            key varchar(64) not null,
            value smalltext not null,
            constraint keyvalues_pk
                primary key (key)
        );`)
        await this.checkRequiredKeys()
    }

    public async GetServers(): Promise<any[]> {
        if(!this._servers) await this.RefreshServers()
        return this._servers
    }

    public async RefreshServers(){
        this._servers = []
    }

    public async GetPublicKeyvalues() {
        let kv = {}
        for(const key of PublicKeys) {
            kv[key] = this.GetKV(key)
        }
        return kv
    }

    public async FindProviders() {
        const providers: RegisteredProvider[] = []
        const data: {key: string}[] = await this.db.all(SQL`SELECT SUBSTRING(key,11) as key FROM keyvalues WHERE key LIKE "providers.%"`)
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
        const data = await this.db.all(SQL`SELECT key, value FROM keyvalues WHERE key LIKE '${parents.join(".")}.%'`)
        return data
    }

    public async GetKV<T extends number | string = string>(key: Keyvalue, defaultValue?: T): Promise<T> {
        const data = await this.db.get(SQL`SELECT value FROM keyvalues WHERE key = ${key}`)
        if(!data) return defaultValue
        return data.value as T ?? defaultValue
    }

    public async GetKVNamespaced<T extends number | string = string>(...args: string[]): Promise<T> {
        return this.GetKV(args.join(".") as Keyvalue, null)
    }

    public async HasKV(key: Keyvalue) {
        return await this.GetKV(key) != undefined 
    }

    public async SetKV(key: Keyvalue, value: string | number) {
        if(value == null || value == undefined) await this.deleteKV(key)
        else await this.db.run(SQL`REPLACE INTO keyvalues (key, value) VALUES (${key}, ${value})`)
    }
    /**
     * Similar to GetKVNamespaced, but the key must be in its own array
     * @param args 
     */
    public async SetKVNamespaced(key: string[], value: string | number) {
        const dbKey = key.join(".") as Keyvalue
        if(value == null || value == undefined) await this.deleteKV(dbKey)
        else await this.db.run(SQL`REPLACE INTO keyvalues (key, value) VALUES (${dbKey}, ${value})`)
    }

    private async deleteKV(key: Keyvalue) {
        await this.db.run(SQL`DELETE FROM keyvalues WHERE key = ${key}`)
    }

    private async checkRequiredKeys() {
        const missing = []
        for(const [key, data] of Object.entries(Keyvalues)) {
            if(data.required) {
                if(!await this.HasKV(key as Keyvalue)) {
                    missing.push(key)
                }
            }
        }

        if(missing.length > 0) {
            console.warn(`[ConfigManager] WARNING: Missing ${missing.length} required configurations:`)
            for(const key of missing) {
                if(Keyvalues[key].description)
                    console.warn(`  ${key} [${Keyvalues[key].type}] - ${Keyvalues[key].description}`)
                else
                    console.warn(`  ${key} [${Keyvalues[key].type}]`)

            }
        }
    }
}