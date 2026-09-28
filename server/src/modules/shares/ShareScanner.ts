import type { Logger as PinoLogger } from 'pino'
import Logger from '../../logger.js'
import Share from './Share.js'
import ShareDatabase from './ShareDB.js'
import SteamAPI from '../steam.js'
import { AddonWorkshopInfo, ScanEvent, ShareInfo, ShareItemState, WorkshopItem } from '@srcpanel/common/Share'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { getMetadata, serializeWorkshopItem } from './ShareUtils.js'
import { DefinedTask, Task } from '../tasks/Task.js'
import TaskManager from '../tasks/TaskManager.js'
import EventEmitter from 'node:events'

const SCAN_INTERVAL_MINS = 60 // every hr

export enum ScanResult {
    AlreadyActive,
    Started,
}

export default class ShareScanner {
    #log: PinoLogger
    #share: ShareInfo
    #db: ShareDatabase
    #steam: SteamAPI
    #job: DefinedTask
    
    #event: EventEmitter
    #promise: Promise<void>
    #scanStart?: number = undefined

    constructor(share: ShareInfo, db: ShareDatabase, steam: SteamAPI, event: EventEmitter) {
        this.#log = Logger.child({ name: `ShareScanner/${share.id}` })
        this.#share = share
        this.#db = db
        this.#steam = steam
        this.#job = TaskManager.Instance.register(`scan/${share.id}`, () => this.start())
        this.#event = event
        TaskManager.Instance.scheduleRepeating(this.#job, { minutes: SCAN_INTERVAL_MINS })
    }

    /**
     * Is a scan active for this share?
     */
    get isScanning() { return this.#scanStart && this.#scanStart > 0 }

    /** Get the time in unix milliseconds when scan was started
     * @returns null if scan inactive, otherwise unix ms from epoch 
    */
    get scanTimeStarted() {
        return this.isScanning ? this.#scanStart : null
    }

    /** Get the time in unix milliseconds that have elapsed
     * @returns null if scan inactive, otherwise duration in ms 
     */
    get scanTimeElapsed() {
        return this.#scanStart ? Date.now() - this.#scanStart : null
    }


    /** Start a scan
     * ScanResult.AlreadyActive if already active
     */
    start(): ScanResult {
        if(this.isScanning) return ScanResult.AlreadyActive

        this.#promise = this.#process()

        return ScanResult.Started
    }

    async #process() {
        try {
            await this.#scan()
        } catch(err) {
            this.#log.error({}, "scan failed: " + err)
        }
    }

    // async stop(): Promise<void> {
    //     if(!this.isScanning) return

    // }

    async #checkAddon(filename: string) {
        const filepath = join(this.#share.sourceFolder, filename)

        const fstat = await stat(filepath)
        const fsinfo = {
            filesize: fstat.size,
            lastModified: Math.round(fstat.mtime.getTime() / 1000),
        }

        let meta: Record<string, any> = {}
        try {
            meta = await getMetadata(filepath)
        } catch(err) {
            this.#log.warn({ err, filename }, "failed to get metadata")
        }

        // If we think it's a steam addon (resolveSteam says true), then mark it as resolving
        const state = this.#resolveSteam(filename) ? ShareItemState.Resolving : ShareItemState.Ready

        await this.#db.upsertAddon(filename, fsinfo, state, meta)
    }

    /**
     * Attempt to resolve file's info from steam
     * @param filename 
     * @returns true if added to queue, false if not valid steam addon
     */
    #resolveSteam(filename: string): boolean {
        // Get steam workshop info if it looks like a workshop id
        if(filename.endsWith(".vpk")) {
            const id = parseInt(filename)
            if(!isNaN(id) && id > 0) {
                this.#steam.addToWSResolveQueue(id, async (item) => {
                    // TODO: keep this? {deleted:true to change to state.missingsteam?}
                    const details: AddonWorkshopInfo = item
                          ? serializeWorkshopItem(item)
                          : { deleted: true, publishedfileid: id }
                    await this.#db.addWorkshopInfo(filename, details)
                })
                return true
            }
        }
        return false
    }

    async #scan() {
        this.#scanStart = Date.now()
        const unchecked = await this.#db.getFilenames()
        const dirents = await readdir(this.#share.sourceFolder, { withFileTypes: true })
        for(const dirent of dirents) {
            if(!dirent.isFile()) continue
            // Check if has valid ext
            if(!this.#share.fileExts?.some(ext => dirent.name.endsWith(ext))) continue
            
            unchecked.delete(dirent.name)

            const entry = await this.#db.getAddonInfo(dirent.name)
            if(!entry || entry.state == ShareItemState.Missing) {
                try {
                    await this.#checkAddon(dirent.name)
                } catch(err) {
                    this.#log.warn({ filename: dirent.name }, "failed to scan item: " + err)
                }
            } else if(entry.state == ShareItemState.Resolving && !entry.workshop) {
                // Item's workshop info was never resolved
                this.#resolveSteam(dirent.name)
            }
        }

        // Process all missing steam data
        await this.#steam.resolveWSQueue()
        await this.#db.markMissing(unchecked)

        this.#event.emit("scan", {
            added: [],
            changed: {},
            removed: [...unchecked.keys()]
        } as ScanEvent)


        const durationSec = Math.round(( Date.now() - this.#scanStart ) / 1000)
        this.#log.info(`Scan took ${durationSec} seconds`)
    }

}