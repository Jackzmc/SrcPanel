// IDEA: start download, gives download id (i++), and client polls/subscribes to that id

/**
 * UI you put id, it resolves, if collection, shows all items to select or adds just one item
 * backend system should just support adding multiple items to the queue
 * 
 */
// 


import { ChildWorkshopItem, DownloadEvent, DownloadLogEntry, DownloadProgress, DownloadSource, DownloadState, ShareItemState, WorkshopItem } from "@srcpanel/common/Share"
import SteamAPI from "../steam.js"
import Share from "./Share.js"
import { join } from "node:path"
import { getChapterIds, serializeWorkshopItem } from "./ShareUtils.js"
import pLimit from "p-limit"
import EventEmitter from "node:events"
import Logger from '../../logger.js'
import type { Logger as PinoLogger } from 'pino'

/**
 * TODO: One queue per share. UI just shows like list of items. All items processed, then gives notification (w/ btn) to restart servers?
 * Global log
 */

/// Limits the number of active downloads. Globally shared between all queues
const CONCURRENT_LIMIT = pLimit(5)

const DOWNLOAD_TIMEOUT_MS = 1000 * 60 * 10 // 10 min
const MAX_LOG_HISTORY = 20

const SOURCE: DownloadSource = "steam_workshop"

interface QueueEntry {
    item: WorkshopItem|ChildWorkshopItem,
    destinations?: string[]
}

export default class WorkshopDownloadQueue {
    #share: Share

    #items: Map<WorkshopItem, DownloadProgress> // id is key
    #pending: Set<QueueEntry> = new Set()

    #logs: DownloadLogEntry[] = []  // TODO: clear when queue completed
    #active: boolean

    #event: EventEmitter = new EventEmitter()

    #log: PinoLogger

    #pendingRestartServers: string[] = []

    constructor(share: Share) {
        this.#share = share
        this.#log = Logger.child({ name: `WorkshopDLQueue/${share.id}` })
    }

    get logs() {
        return this.#logs
    }

    get pendingCount() {
        return this.#pending.size
    }
    
    get allItemsComplete() {
        for(const progress of this.#items.values()) {
            if(progress.state == DownloadState.Pending || progress.state == DownloadState.Downloading) {
                return false
            }
        }
        return true
    }

    /**
     * Subscribe to events
     * @param cb callback for every event
     * @returns unsubscribe function - call to unsubscribe
     */
    subscribe(cb: (event: DownloadEvent) => void) {
          const bound = {
            progress: (data) => cb({ type: "progress", source: SOURCE, data }),
            log: (data) => cb({ type: "log", source: SOURCE, data }),
            finish: () => cb({type: "finish", source: SOURCE, data: null }),
        };
        for (const [e, fn] of Object.entries(bound)) this.#event.on(e, fn);
        return () => {
            for (const [e, fn] of Object.entries(bound)) this.#event.removeListener(e, fn);
        };
    }


    #addLog(type: string, message: string) {
        const log = {
            type,
            message,
            timestamp: Date.now()
        }
        this.#logs.push(log)
        // Remove extra
        if(this.#logs.length > MAX_LOG_HISTORY) {
            this.#logs.splice(0, this.#logs.length - MAX_LOG_HISTORY)
        }

        this.#event.emit("log", log)
    }

    // how do i tell if done. promise.all but we keep dumping them all in the list
    async #start() {
        if(this.#active) return 
        this.#active = true
        this.#pendingRestartServers = []
        this.#items.clear()
        this.#pending.clear()

        const itemIterator = this.#popNextItem()
        let result = itemIterator.next()
        while(!result.done) {
            console.log("result", result.done, result.value)
            // Schedule next item
            if(!result.value) break
            // FIXME: result.value null here??
            CONCURRENT_LIMIT(async(entry: QueueEntry) => {
                try {
                    await this.#startDownload(entry)
                } catch(err) {
                    this.#log.error({ id: entry.item.publishedfileid }, "download error: " + err.stack)
                    this.#addLog("ERROR", `Failed to download ${entry.item.publishedfileid}`)
                }
            }, result.value)

            result = itemIterator.next()
        }

        this.#addLog("INFO", "Queue completed")
        this.#log.info("Queue completed")

        // All items in queue have been consumed. Some may still be processing but no more after
        // TODO: let them just run in bg, or do we need to check and wait for them?
        this.#active = false
        this.#event.emit("done")
    }

    *#popNextItem() {
        for(const item of this.#pending.keys()) {
            this.#pending.delete(item)
            yield item
        }
        return null
    }

    /**
     * Enqueues items to be downloaded
     * @param items 
     */
    downloadItems(items: (WorkshopItem|ChildWorkshopItem)[], destinations?: string[]) {
        // TODO: somehow keep track of destinations it should be automatically installed to
        for(const item of items) {
            this.#items.set(item, {
                downloaded: 0,
                total: item.file_size,
                state: DownloadState.Pending
            })
            this.#pending.add({ item, destinations })
        }
        this.#start()
    }

    /**
     * Restart all servers that this queue has downloaded to
     */
    async restartServers() {

    }

    async #startDownload(entry: QueueEntry) {
        const filename = `${entry.item.publishedfileid}.vpk`
        this.#addLog("DOWNLOAD", `Started download of ${filename}`)
    
        const event = SteamAPI.downloadItemProgress(entry.item, this.#share.sourceFolder, { timeout: DOWNLOAD_TIMEOUT_MS })
        event.addListener("progress", (curBytes, totalBytes) => {
            const progress = this.#items.get(entry.item)
            if(!progress) throw Error("Untracked item")
            progress.downloaded = curBytes
            this.#event.emit("progress", { 
                filename,
                percent: curBytes / totalBytes
            })
            //#this.items.set(item, progress)
        })
        event.addListener("finish", (curBytes, totalBytes) => {
            if (curBytes != entry.item.file_size) {
                throw new Error(`Downloaded size mismatch (downloaded ${curBytes} bytes, expected ${entry.item.file_size} bytes)`)
            }

            this.#event.emit("progress", { 
                filename,
                percent: 1.0
            })

            this.#addLog("DOWNLOAD", `Downloaded ${filename}`)
            
            let chapterIds: string[] | null = null
            try {
                chapterIds = getChapterIds(join(this.#share.sourceFolder, filename))
            } catch(err) {
                this.#log.warn({ id: entry.item.publishedfileid }, "vpk parse error: " + err.stack)
                this.#addLog("ERROR", `Could not parse ${entry.item.publishedfileid}'s VPK file`)
            }
    
            this.#share.db.addAddon(filename, {
                filesize: entry.item.file_size,
                lastModified: entry.item.time_updated
                }, ShareItemState.Ready, { chapterIds })
            
            // Enable for every destination
            entry.destinations?.forEach(dest => {
                this.#share.enable(filename, dest)
                // Add any servers we should restart once queue is over
                if(this.#share.destinations[dest].restartTargets) 
                    this.#pendingRestartServers.push(...this.#share.destinations[dest].restartTargets)
            })

            // Add workshop info
            if('collection' in entry.item)
                this.#share.db.addWorkshopInfo(filename, serializeWorkshopItem(entry.item), entry.item.collection)
        })
    }
}

