import type { Logger as PinoLogger } from 'pino'
import Logger from '../../logger.js'
import BetterSqlite from 'better-sqlite3'
import { migrate } from '@blackglory/better-sqlite3-migrations'
import { join } from 'node:path';
import { AddonInfo, AddonWorkshopInfo, ShareInfo, ShareItemState, WorkshopCollectionInfo } from '@srcpanel/common/Share';
import { findMigrationFilenames, IMigration, readMigrationFile } from 'migration-files'

type DBDriver = BetterSqlite.Database

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
            const migrationsPath = join(process.cwd(), "migrations/shares")
            const migrationFiles = await findMigrationFilenames(migrationsPath)
            const migrations: IMigration[] = []
            for (const file of await findMigrationFilenames(migrationsPath)) {
                migrations.push(await readMigrationFile(file))
            }
            Logger.debug({ migrationsPath, migrationFiles }, "running migrations")
            migrate(db, migrations)
        }catch(err) {
            throw new Error(`Error running db migrations`, { cause: err })
        }
    }

    static async #openDatabase(filename: string): Promise<DBDriver> {
        try {
            const db = BetterSqlite(filename)
            db.pragma('journal_mode = WAL');
            return db
        }catch(err) {
            throw new Error(`Could not open database file at \"${filename}\"`, { cause: err })
        }
    }

    private constructor(share: ShareInfo, db: DBDriver) {
        this.#log = Logger.child({ name: `ShareDB/${share.id}` })
        this.#share = share
        this.#db = db
        this.#log.info({}, `DB Ready`)
    }

    async getFilenames(): Promise<Set<string>> {
        const rows = this.#db
            .prepare<any[], { filename: string}>("SELECT filename FROM addoncache")
            .all()
        return new Set(rows.map(row => row.filename))
    }

    async getAddons() : Promise<AddonInfo[]> {
        this.#log.trace({ time: performance.now() }, "getAddons START")
        const rows = this.#db
            .prepare<any[], any>(`
                SELECT filename, filesize, state, lastModified, ws_info, collection_id, c.name as collection_name, chapter_ids, metadata 
                FROM addoncache
                LEFT JOIN workshop_collections c ON collection_id = c.id
            `).all();
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
     * Attempt to create workshop collection entry, if doesn't exist, otherwise update name
     * @param id workshop id
     * @param name 
     */
    async tryCreateCollection(id: string, name: string): Promise<void> {
        this.#db
            .prepare(`
                INSERT OR IGNORE INTO workshop_collections (id, name) 
                VALUES (?, ?)    
                ON CONFLICT(id) DO UPDATE SET name = ?
            `)
            .run([ id, name, name ])
    }

    async addAddon(filename: string, fsInfo?: { filesize: number, lastModified: number }, state: ShareItemState = ShareItemState.Ready, meta: Record<string, any> | null = null): Promise<void> {
        this.#db
            .prepare(`
                REPLACE INTO addoncache
                    (filename, filesize, lastModified, state, metadata)
                    VALUES (?, ?, ?, ?, ?)
            `)
            .run([ filename, fsInfo?.filesize, fsInfo?.lastModified, state, JSON.stringify(meta) ])
    }

    async addWorkshopInfo(filename: string, wsInfo: AddonWorkshopInfo, collection?: WorkshopCollectionInfo): Promise<void> {
        if(collection != null) {
            await this.tryCreateCollection(collection.id, collection.name)
        }
        this.#db
            .prepare(
                `UPDATE addoncache SET state = ?, ws_info = ?, collection_id = ? WHERE filename = ?`
            )
            .run([ ShareItemState.Ready, JSON.stringify(wsInfo), collection?.id, filename ])
    }


    public async remove(filename: string): Promise<void> {
        this.#db
            .prepare(
                `DELETE FROM addoncache WHERE filename = ?`
            )
            .run([filename])
    }

    /**
     * Get addon info from cache
     * @param filename filename with ext
     * @returns Promise<AddonInfo | undefined>
     */
    public async getAddonInfo(filename: string): Promise<AddonInfo | null> {
        const info = this.#db
            .prepare<any[], AddonInfo>(`SELECT * FROM addoncache WHERE filename = ?`)
            .get([filename])
        if (!info) return null
        return info

    }

    /**
     * Marks list of filenames as missing
     * @param filenames 
     */
    async markMissing(filenames: Set<string>) {
        const stmt = this.#db.prepare("UPDATE addoncache SET state = ? WHERE filename = ?")
        for(const filename of filenames) {
            stmt.run([ ShareItemState.Missing, filename ])
        }
    }
}