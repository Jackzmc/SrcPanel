import sqlite3 from 'sqlite3'
import sqlite, { open } from 'sqlite'
import SQL from 'sql-template-strings';
import { join } from 'path';
import { DownloadSourceE } from './Share';

export default class ConfigManager {
    private db: sqlite.Database<sqlite3.Database, sqlite3.Statement>


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

    public async GetShares(): Promise<ShareData[]> {
        const shares = await this.db.all<any[]>(SQL`SELECT * FROM shares`)
        const dests = await this.db.all<any[]>(SQL`SELECT * FROM share_dests`)
        
        return shares.map((share: any) => {
            let destinations = {}
            for(const dest of dests) {
                if(dest.share_id === share.id) {
                    destinations[dest.id] = {
                        name: dest.name,
                        path: dest.path
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
            }
        })
    }

    public async GetKV<T extends number | string>(key: string): Promise<T> {
        const data = await this.db.get(SQL`SELECT value FROM keyvalues WHERE key = ${key}`)
        return data.value as T
    }

    public async SetKV(key: string, value: string | number) {
        await this.db.run(SQL`REPLACE INTO keyvalues (key, value) VALUES (${key}, ${value})`)
    }

}

interface ShareData {
    id: string,
    name?: string,
    sourceFolder: string,
    steamAppid?: number,
    allowedExts: string[],
    downloadSources: DownloadSourceE,
    destinations: Record<string, ShareDestData>
}

interface ShareDestData {
    name?: string,
    path: string
}