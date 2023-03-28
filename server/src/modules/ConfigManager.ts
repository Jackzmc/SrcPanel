import sqlite3 from 'sqlite3'
import sqlite, { open } from 'sqlite'
import SQL from 'sql-template-strings';
import { join } from 'path';

export interface KeyConfig {
    public?: boolean,
    name?: string
    type: KeysType,
    sensitive?: boolean
}
export type KeysType = "string" | "integer" | "float" | "url" | "path"
export type Keyvalue = "discord_link" | "test_public" | "test_int" | "test_float" | "discord.appid" | "discord.appsecret"
export type KeysRecords = Record<Keyvalue, KeyConfig>
export const Keyvalues: KeysRecords = {
    "discord.appid": { type: "string", name: "Discord Appid"},
    "discord.appsecret": { type: "string", name: "Discord Appid", sensitive: true},
    discord_link: { type: "url", name: "Discord Invite Code" },
    test_public: { type: "string", public: true },
    test_int: { type: "integer", public: true },
    test_float: { type: "float", public: true },
}
const PublicKeys = Object.entries(Keyvalues).filter(([k,v]) => v.public).map(([k,v]) => k) as Keyvalue[]


export default class ConfigManager {
    private db: sqlite.Database<sqlite3.Database, sqlite3.Statement>
    private _shares: ShareData[] = null
    private _servers: any[] = null

    public async Load(dataDir: string) {
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
    }

    public async GetServers(): Promise<any[]> {
        if(!this._servers) await this.RefreshServers()
        return this._servers
    }

    public async RefreshServers(){
        this._servers = []
    }

    public async GetShares(): Promise<ShareData[]> {
        if(!this._shares) await this.RefreshShares()
        return this._shares
    }

    public async RefreshShares() {
        const shares = await this.db.all<any[]>(SQL`SELECT * FROM shares`)
        const dests = await this.db.all<any[]>(SQL`SELECT * FROM share_dests`)

        this._shares = shares.map((share: any) => {
            let destinations = {}
            for(const dest of dests) {
                if(dest.share_id === share.id) {
                    destinations[dest.id] = {
                        name: dest.name,
                        path: dest.path,
                        serverIds: dest.server_ids?.split(",") ?? []
                    }
                }
            }

            return {
                id: share.id,
                name: share.name,
                sourceFolder: share.source_folder,
                steamAppid: share.steam_appid,
                allowedExts: share.valid_exts?.split(',') ?? [],
                downloadSources: share.download_sources,
                destinations
            } as ShareData
        })
    }

    public async GetPublicKeyvalues() {
        let kv = {}
        for(const key of PublicKeys) {
            kv[key] = this.GetKV(key)
        }
        return kv
    }

    public async GetKV<T extends number | string = string>(key: Keyvalue, defaultValue?: T): Promise<T> {
        const data = await this.db.get(SQL`SELECT value FROM keyvalues WHERE key = ${key}`)
        if(!data) return defaultValue
        return data.value as T ?? defaultValue
    }

    public async HasKV(key: Keyvalue) {
        return this.GetKV(key) != null
    }

    public async SetKV(key: Keyvalue, value: string | number) {
        if(value == null || value == undefined) await this.deleteKV(key)
        else await this.db.run(SQL`REPLACE INTO keyvalues (key, value) VALUES (${key}, ${value})`)
    }

    private async deleteKV(key: Keyvalue) {
        await this.db.run(SQL`DELETE FROM keyvalues WHERE key = ${key}`)
    }
}