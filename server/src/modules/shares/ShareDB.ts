import type { Logger as PinoLogger } from 'pino'
import Logger from '../../logger.js'
import sqlite3 from 'sqlite3';
import sqlite from 'sqlite'
import { open as sqliteOpen } from 'sqlite'
import { join } from 'node:path';
import { AddonInfo, AddonWorkshopInfo, ShareInfo, ShareItemState, WorkshopCollectionInfo } from '@srcpanel/common/Share';
import { SQL } from 'sql-template-strings';

const MIGRATIONS = [
  `ALTER TABLE addoncache ADD metadata TEXT`,
  `ALTER TABLE addoncache ADD state INTEGER`,
]

export default class ShareDatabase {
    #log: PinoLogger
    #share: ShareInfo
    #db: sqlite.Database<sqlite3.Database, sqlite3.Statement>

    static async init(share: ShareInfo) {
        const path = join(share.sourceFolder, `panel_share.db`)
        const sqlDb = await sqliteOpen({
            filename: path,
            driver: sqlite3.Database
        })

        await sqlDb.migrate({ 
            migrationsPath: "migrations/shares"
        })

        return new ShareDatabase(share, sqlDb)
    }

    private constructor(share: ShareInfo, db: sqlite.Database<sqlite3.Database, sqlite3.Statement>) {
        this.#log = Logger.child({ name: `ShareDB/${share.id}` })
        this.#share = share
        this.#db = db
        this.#log.info("DB Ready")
    }

    async getFilenames(): Promise<Set<string>> {
        const rows = await this.#db.all<{ filename: string}[]>("SELECT filename FROM addoncache")
        console.log("rows", rows)
        return new Set(rows.map(row => row.filename))
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