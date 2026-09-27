import type { Logger as PinoLogger } from 'pino'
import Logger from '../../logger.js'
import sqlite3 from 'sqlite3';
import sqlite from 'sqlite'
import { open as sqliteOpen } from 'sqlite'
import { join } from 'node:path';
import { AddonInfo, AddonWorkshopInfo, ShareInfo, ShareItemState, WorkshopCollectionInfo } from '@srcpanel/common/Share';
import { SQL } from 'sql-template-strings';

type DBDriver = sqlite.Database<sqlite3.Database, sqlite3.Statement>

export default class ShareDatabase {
    #log: PinoLogger
    #share: ShareInfo
    #db: DBDriver

    static async init(share: ShareInfo) {
        const filename = process.env.NODE_ENV === "production"
            ? `panel_share.db`
            : `panel_share.${process.env.NODE_ENV?.toLowerCase() ?? 'dev'}.db`
        const path = join(share.sourceFolder, filename)

        const sqlDb = await this.#openDatabase(path)
        await this.#runMigrations(sqlDb)
        return new ShareDatabase(share, sqlDb)
    }

    static async #runMigrations(db: DBDriver) {
        try {
            await db.migrate({ 
                migrationsPath: "migrations/shares"
            })
        }catch(err) {
            throw new Error(`Error running db migrations"`, { cause: err })
        }
    }

    static async #openDatabase(filename: string): Promise<DBDriver> {
        try {
            return await sqliteOpen({
                filename,
                driver: sqlite3.Database
            })
        }catch(err) {
            throw new Error(`Could not open database file at \"${filename}\"`, { cause: err })
        }
    }

    private constructor(share: ShareInfo, db: sqlite.Database<sqlite3.Database, sqlite3.Statement>) {
        this.#log = Logger.child({ name: `ShareDB/${share.id}` })
        this.#share = share
        this.#db = db
        this.#log.info({}, `Loaded database at ${db.config.filename}`)
    }

    async getFilenames(): Promise<Set<string>> {
        const rows = await this.#db.all<{ filename: string}[]>("SELECT filename FROM addoncache")
        return new Set(rows.map(row => row.filename))
    }

    async getAddons(): Promise<AddonInfo[]> {
        this.#log.trace({ time: performance.now() }, "getAddons START")
        const rows = await this.#db.all(`
            SELECT filename, filesize, state, lastModified, ws_info, collection_id, c.name as collection_name, chapter_ids, metadata 
            FROM addoncache
            LEFT JOIN workshop_collections c ON collection_id = c.id
        `);
        this.#log.trace({ time: performance.now() }, "getAddons END")
        return rows.map<AddonInfo>(row => {
            return {
                filename: row.filename,
                filesize: row.filesize,
                state: row.state ?? ShareItemState.Ready,
                lastModified: row.lastModified,
                workshop: row.ws_info ? JSON.parse(row.ws_info) : null,
                collection: row.collection_id ? {
                    id: row.collection_id,
                    name: row.collection_name
                } : undefined,
                installInfo: {}, // Not ideal but we fill it in Share
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
            REPLACE INTO addoncache
                (filename, filesize, lastModified, state, metadata)
                VALUES (?, ?, ?, ?, ?)`,
            [ filename, fsInfo?.filesize, fsInfo?.lastModified, state, JSON.stringify(meta) ]
        )
    }

    async addWorkshopInfo(filename: string, wsInfo: AddonWorkshopInfo, collection?: WorkshopCollectionInfo): Promise<void> {
        if(collection != null) {
            await this.tryCreateCollection(collection.id, collection.name)
        }
        await this.#db.run(
            `UPDATE addoncache SET state = ?, ws_info = ?, collection_id = ? WHERE filename = ?`,
            [ ShareItemState.Ready, JSON.stringify(wsInfo), collection?.id, filename ]
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