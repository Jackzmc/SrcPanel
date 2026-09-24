// IDEA: start download, gives download id (i++), and client polls/subscribes to that id

/**
 * UI you put id, it resolves, if collection, shows all items to select or adds just one item
 * backend system should just support adding multiple items to the queue
 * 
 */
// 


import { ChildWorkshopItem, DownloadEvent, DownloadLogEntry, DownloadProgress, DownloadState, ShareItemState, WorkshopItem } from "@srcpanel/common/Share"
import SteamAPI from "../steam.js"
import Share from "./Share.js"
import { join } from "node:path"
import { getChapterIds, serializeWorkshopItem } from "./ShareUtils.js"
import pLimit from "p-limit"
import { EventEmitter } from "node:stream"

/**
 * TODO: One queue per share. UI just shows like list of items. All items processed, then gives notification (w/ btn) to restart servers?
 * Global log
 */

/// Limits the number of active downloads. Globally shared between all queues
const CONCURRENT_LIMIT = pLimit(5)

const DOWNLOAD_TIMEOUT_MS = 1000 * 60 * 10 // 10 min
const MAX_LOG_HISTORY = 20


export default class WorkshopDownloadQueue {
    #share: Share

    #items: Map<WorkshopItem, DownloadProgress> // id is key
    #pending: Set<WorkshopItem> = new Set()

    #logs: DownloadLogEntry[] = []  // TODO: clear when queue completed
    #active: boolean

    #event: EventEmitter

    constructor(share: Share) {
        this.#share = share
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
            progress: (data) => cb({ type: "progress", data }),
            log: (data) => cb({ type: "log", data }),
            finish: () => cb({type: "finish", data: null }),
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

        const itemIterator = this.#popNextItem()
        let result = itemIterator.next()
        while(!result.done) {
            // Schedule next item
            CONCURRENT_LIMIT(() => this.#startDownload(result.value!))

            result = itemIterator.next()
        }

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
    async downloadItems(items: ChildWorkshopItem[]) {
        for(const item of items) {
            this.#pending.add(item)
        }
        this.#start()
    }

    async #startDownload(item: ChildWorkshopItem) {
        const filename = `${item.publishedfileid}.vpk`
        this.#addLog("DOWNLOAD", `Started download of ${filename}`)
    
        const event = SteamAPI.downloadItemProgress(item, this.#share.sourceFolder, { timeout: DOWNLOAD_TIMEOUT_MS })
        event.addListener("progress", (curBytes, totalBytes) => {
            const progress = this.#items.get(item)
            if(!progress) throw Error("Untracked item")
            progress.downloaded = curBytes
            this.#event.emit("progress", { 
                filename,
                percent: curBytes / totalBytes
            })
            //#this.items.set(item, progress)
        })
        event.addListener("finish", (curBytes, totalBytes) => {
            if (curBytes != item.file_size) {
                throw new Error(`Downloaded size mismatch (downloaded ${curBytes} bytes, expected ${item.file_size} bytes)`)
            }

            this.#event.emit("progress", { 
                filename,
                percent: 1.0
            })

            this.#addLog("DOWNLOAD", `Downloaded ${filename}`)

            const chapterIds = getChapterIds(join(this.#share.sourceFolder, filename))
    
            this.#share.db.addAddon(filename, {
                filesize: item.file_size,
                lastModified: item.time_updated
                }, ShareItemState.Ready, { chapterIds })
            this.#share.db.addWorkshopInfo(filename, serializeWorkshopItem(item), item.collection)
        })
    }
}

