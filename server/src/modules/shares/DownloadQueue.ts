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


interface QueueEntry {
    item: WorkshopItem|ChildWorkshopItem,
    destinations?: string[]
}

export default class WorkshopDownloadQueue {
    #share: Share

    #items: Map<WorkshopItem, DownloadProgress> = new Map() // id is key

    #logs: DownloadLogEntry[] = []  // TODO: clear when queue completed

    #log: PinoLogger

    #pendingRestartServers: string[] = []
    #inFlight = new Set<Promise<void>>()

    constructor(share: Share) {
        this.#share = share
        this.#log = Logger.child({ name: `WorkshopDLQueue/${share.id}` })
    }

    get pendingItems() {
        return this.#inFlight.size
    }

    get logs() {
        return this.#logs
    }

    get allItemsComplete() {
        for(const progress of this.#items.values()) {
            if(progress.state == DownloadState.Pending || progress.state == DownloadState.Downloading) {
                return false
            }
        }
        return true
    }

    #addLog(type: string, message: string, itemId?: string) {
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

        this.#share.eventStream.emit("log", log, itemId)
    }

    /**
     * Enqueues items to be downloaded
     * @param items list of items to install
     * @param destinations list of optional destinations to install to on completition
     */
    downloadItems(items: (WorkshopItem|ChildWorkshopItem)[], destinations?: string[]) {
        this.#log.trace({ size: items.length }, "adding to queue")
        for(const item of items) {
            const progress = {
                downloaded: 0,
                total: Number(item.file_size),
                state: DownloadState.Pending
            }
            this.#items.set(item, progress)
            const p = CONCURRENT_LIMIT(() => this.#startDownload({ item, destinations }))
                .catch(err => {
                    this.#log.error({ id: item.publishedfileid }, `download error: ${err.stack}`)
                    this.#addLog("ERROR", `Failed to download ${item.publishedfileid}`)
                })
                .finally(() => {
                    this.#inFlight.delete(p)
                    // Notify we completed queue
                    if(this.#inFlight.size == 0) {
                        this.#share.eventStream.emit("finish")
                    }
                })
            this.#inFlight.add(p)
        }
    }


    /**
     * Restart all servers that this queue has downloaded to
     */
    async restartServers() {

    }

    async #startDownload(entry: QueueEntry) {
        const filename = `${entry.item.publishedfileid}.vpk`
        this.#addLog("DOWNLOAD", `Started download of ${filename}`)

        this.#log.debug({ filename }, "download started")

        const progress = this.#items.get(entry.item)
        if(!progress) throw new Error("Untracked item")
        progress.state = DownloadState.Downloading
    
        const event = SteamAPI.downloadItemProgress(entry.item, this.#share.sourceFolder, { timeout: DOWNLOAD_TIMEOUT_MS })
        event.addListener("progress", (curBytes, totalBytes) => {
            const progress = this.#items.get(entry.item)
            if(!progress) throw Error("Untracked item")
            progress.downloaded = curBytes
            this.#share.eventStream.emit("progress", progress, filename)
            //#this.items.set(item, progress)
        })
        event.addListener("finish", async (curBytes, totalBytes) => {
            const progress = this.#items.get(entry.item)
            if(!progress) throw Error("Untracked item")
            progress.downloaded = curBytes

            if (curBytes != entry.item.file_size) {
                this.#addLog("ERROR", `Downloaded size mismatch (downloaded ${curBytes} bytes, expected ${entry.item.file_size} bytes)`, filename)
                this.#log.warn({ filename }, `downloaded size mismatch (downloaded ${curBytes} bytes, expected ${entry.item.file_size} bytes)`)
                progress.state = DownloadState.Failed 
                return
            } 

            progress.state = DownloadState.Complete
            
            this.#share.eventStream.emit("progress", progress, filename)
            this.#log.debug({ filename }, "download completed")
            this.#addLog("DOWNLOAD", `Downloaded ${filename}`, filename)
            
            let chapterIds: string[] | null = null
            try {
                chapterIds = getChapterIds(join(this.#share.sourceFolder, filename))
            } catch(err) {
                this.#log.warn({ id: entry.item.publishedfileid }, "vpk parse error: " + err.stack)
                this.#addLog("ERROR", `Could not parse ${filename}'s VPK file`, filename)
            }
    
            await this.#share.db.addAddon(filename, {
                filesize: entry.item.file_size,
                lastModified: entry.item.time_updated
                }, ShareItemState.Ready, { chapterIds }
            )
                .catch(err => {
                    this.#addLog("ERROR", `Could not record ${filename} to database`, filename)
                    this.#log.error({ id: entry.item.publishedfileid }, "db error: " + err.stack)
                })
            
            // Enable for every destination
            if(entry.destinations) {
                for(const dest of entry.destinations) {
                    try {
                        await this.#share.enable(filename, dest)
                        
                        // Add any servers we should restart once queue is over
                        if(this.#share.destinations[dest].restartTargets) 
                        this.#pendingRestartServers.push(...this.#share.destinations[dest].restartTargets)
                    } catch(err) {
                        this.#addLog("ERROR", `Failed to enable ${filename} on destination ${dest} (${err.code})`, filename)
                        this.#log.warn({ id: entry.item.publishedfileid, dest }, "could not symlink file: " + err.stack)
                    }
                }
            }
            // Add workshop info
            if('collection' in entry.item)
                await this.#share.db.addWorkshopInfo(filename, serializeWorkshopItem(entry.item), entry.item.collection)
                    .catch(err => {
                        this.#addLog("ERROR", `Error adding workshop information for ${filename}`, filename)
                        this.#log.warn({ id: entry.item.publishedfileid }, "addWorkshopInfo error: " + err.stack)
                    })
        })
    }
}

