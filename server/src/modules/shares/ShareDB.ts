import type { Logger as PinoLogger } from 'pino'
import Logger from '../../logger.js'
import Share from './Share.js'
import sqlite3 from 'sqlite3';
import sqlite from 'sqlite'

export enum ShareItemState {
    Pending,
    Resolving,
    Ready,
    Missing
}

const MIGRATIONS = [
  `ALTER TABLE addoncache ADD metadata TEXT`,
  `ALTER TABLE addoncache ADD state INTEGER`,
]

export default class ShareDatabase {
    #log: PinoLogger
    #share: Share
    #db: sqlite.Database<sqlite3.Database, sqlite3.Statement>

    constructor(share: Share, db: sqlite.Database<sqlite3.Database, sqlite3.Statement>) {
        this.#log = Logger.child({ name: `ShareDB/${share.id}` })
        this.#share = share
        this.#db = db
        db.exec(`CREATE TABLE IF NOT EXISTS meta (
            key VARCHAR(128) NOT  NULL,
            value VARCHAR(128) NOT NULL,
            PRIMARY KEY(key)
        );`)
        db.exec(`CREATE TABLE IF NOT EXISTS addoncache (
            filename VARCHAR(128) NOT NULL,
            filesize INT,
            lastModified INT,
            ws_info TEXT,
            collection_id VARCHAR(32),
            collection_name VARCHAR(64),
            chapter_ids TEXT,
            metadata TEXT,
            PRIMARY KEY (filename)
        );`)
        db.exec(`CREATE TABLE IF NOT EXISTS meta (
            key VARCHAR(128) NOT NULL,
            value VARCHAR(128) NOT NULL,
            PRIMARY KEY (key)
        );`)

        this.setupDB()
        // db.exec(SQL`ALTER TABLE addoncache
        //     ADD COLUMN chapter_ids TEXT;`).catch(() => {})
      }

      async setupDB() {
        this.#log.debug("running migrations")
        await this.#db.migrate({
            migrationsPath: "migrations/shares"
        })
        this.#log.info("DB Ready")
      }
    
      async runMigrations() {
        const result = await this.#db.get("SELECT value FROM meta WHERE key = 'current_migration'")
        let currentMigration = result ? result.value : 0
        if (currentMigration >= MIGRATIONS.length) return;
        while (currentMigration < MIGRATIONS.length) {
          this.#log.debug(`Running migration #${currentMigration}`)
          try {
            await this.#db.exec(`ALTER TABLE addoncache ADD metadata TEXT`)
            currentMigration++
            this.#log.info(`Migration #${currentMigration}: OK`)
          } catch (err: any) {
            this.#log.error(`Migration #${currentMigration}: Error:`, err)
            return
          }
        }
        await this.#db.run(`INSERT INTO meta (key, value) VALUES ('current_migration', ?)`, [currentMigration])
        await this.#db.run(`UPDATE meta SET value = ? WHERE key = 'current_migration'`, [currentMigration])
      }



    async getFilenames(): Promise<Set<string>> {
        const rows = await this.#db.get("SELECT filename FROM addoncache")
        console.log("rows", rows)
        return new Set(rows.map(row => row.filename))
    }

}