import type { Logger as PinoLogger } from 'pino'
import Logger from '../../logger.js'
import sqlite3 from 'sqlite3';
import sqlite from 'sqlite'
import { open as sqliteOpen } from 'sqlite'
import { join } from 'node:path';
import { AddonInfo, AddonWorkshopInfo, ShareInfo, ShareItemState, WorkshopCollectionInfo } from '@srcpanel/common/Share';
import { SQL } from 'sql-template-strings';

export default class ShareDatabase {
    #log: PinoLogger
    #share: ShareInfo
    #db: sqlite.Database<sqlite3.Database, sqlite3.Statement>

    static async init(share: ShareInfo) {
        const path = join(share.sourceFolder, `panel_share.db`)
        
        try {
            const sqlDb = await sqliteOpen({
                filename: path,
                driver: sqlite3.Database
            })
            
            try {
                await sqlDb.migrate({ 
                    migrationsPath: "migrations/shares"
                })

                return new ShareDatabase(share, sqlDb)
            } catch(err) {
                throw new Error("Failed to run migrations", { cause: err })
            }
        }catch(err) {
            throw new Error(`Could not open database file at \"${path}\"`, { cause: err })
        }
    }

    private constructor(share: ShareInfo, db: sqlite.Database<sqlite3.Database, sqlite3.Statement>) {
        this.#log = Logger.child({ name: `ShareDB/${share.id}` })
        this.#share = share
        this.#db = db
        this.#log.info("DB Ready")
    }

    async getFilenames(): Promise<Set<string>> {
        const rows = await this.#db.all<{ filename: string}[]>("SELECT filename FROM addoncache")
        return new Set(rows.map(row => row.filename))
    }

    async getAddons(): Promise<AddonInfo[]> {
        const rows = await this.#db.all(`
            SELECT filename, filesize, state, lastModified, ws_info, collection_id, c.name as collection_name chapter_ids, metadata 
            FROM addoncache
            LEFT JOIN workshop_collections c ON collection_id = c.id
        `);
        return rows.map<AddonInfo>(row => {
            return {
                filename: row.filename,
                filesize: row.filesize,
                state: row.state,
                lastModified: row.lastModified,
                workshop: row.ws_info ? JSON.parse(row.ws_info) : null,
                collection: row,
                installInfo: {}, // TODO: we don't have this here
                meta: row.meta ? JSON.parse(row.meta) : {}
            } 
        })
    }

    /**
     * Adds an addon to the cache
     * @param filename the filename with ext
     * @param fsInfo File system info (filesize, lastModified)
     * @param workshop (optional) workshop item details info
     * @param collection (optional) workshop collection info (collection id and name)
     */
    async addAddonEntry(filename: string, fsInfo?: { filesize: number, lastModified: number }, workshop?: AddonWorkshopInfo, collection?: WorkshopCollectionInfo, meta: Record<string, any> | null = null) {
        try {
            // console.debug(`adding \"${filename}\" [fs=${fsInfo != null}] [workshop=${workshop != null}] [collection=${collection != null}]`)
            await this.#db.run(SQL
            `REPLACE INTO addoncache
            (filename, filesize, lastModified, ws_info, collection_id, collection_name, metadata)
            VALUES(${filename}, ${fsInfo?.filesize}, ${fsInfo?.lastModified}, ${workshop ? JSON.stringify(workshop) : null}, ${collection?.id}, ${collection?.name}, ${meta ? JSON.stringify(meta) : null})`
            )
        } catch (err) {
            this.#log.error({ fsInfo: fsInfo !== null, workshop: workshop !== undefined }, `addAddonEntry failed for "${filename}"`, err)
        }
    }

    /**
     * Attempt to create workshop collection entry, if doesn't exist, otherwise update name
     * @param id workshop id
     * @param name 
     */
    async tryCreateCollection(id: string, name: string): Promise<void> {
        await this.#db.run(`
            INSERT OR IGNORE INTO workshop_collections (id, name) 
            VALUES (?, ?)    
            ON CONFLICT(id) DO UPDATE SET name = ?
        `, [ id, name, name ])
    }

    async addAddon(filename: string, fsInfo?: { filesize: number, lastModified: number }, state: ShareItemState = ShareItemState.Ready, meta: Record<string, any> | null = null): Promise<void> {
        await this.#db.run(`
            INSERT INTO addoncache
                (filename, filesize, lastModified, state, metadata)
                VALUES (?, ?, ?, ?, ?)`,
            [ filename, fsInfo?.filesize, fsInfo?.lastModified, state, JSON.stringify(meta) ]
        )
    }

    async addWorkshopInfo(filename: string, wsInfo: AddonWorkshopInfo, collection?: WorkshopCollectionInfo): Promise<void> {
        if(collection != null) {
            await this.tryCreateCollection(collection.id, collection.name)
        }
        await this.#db.run(`
            UPDATE addoncache SET state = ?, ws_info = ?, collection_id = ? WHERE filename = ?`
            [ ShareItemState.Ready, wsInfo, collection?.id, filename ]
        )
    }


    public async remove(filename: string): Promise<void> {
        await this.#db.exec(SQL`DELETE FROM addoncache WHERE filename = ${filename}`)
    }

    /**
     * Get addon info from cache
     * @param filename filename with ext
     * @returns Promise<AddonInfo | undefined>
     */
    public async getAddonInfo(filename: string): Promise<AddonInfo | null> {
        const info = await this.#db.get(SQL`SELECT * FROM addoncache WHERE filename = ${filename}`)
        if (!info) return null
        return info
        // const installInfo = await this.getInstallInfo(filename)
        // assert(installInfo != undefined, "addon info checked in cache")
        // return {
        //     filename: info.filename,
        //     filesize: info.filesize ?? installInfo.size,
        //     lastModified: info.lastModified ?? installInfo.modified,
        //     downloaded: installInfo.created,
        //     workshop: info.ws_info ? JSON.parse(info.ws_info) as AddonWorkshopInfo : undefined,
        //     installInfo: installInfo.states,
        //     collection: info.collection_id ? {
        //         id: info.collection_id,
        //         name: info.collection_name
        //     } : null,
        //     meta: info.metadata ? JSON.parse(info.metadata) : {}
        // }
    }

    /**
     * Marks list of filenames as missing
     * @param filenames 
     */
    async markMissing(filenames: Set<string>) {
        // TODO: batch this
        for(const filename of filenames) {
            await this.#db.run("UPDATE addoncache SET state = ? WHERE filename = ?",
                [ ShareItemState.Missing, filename ]
            )
        }
    }
}