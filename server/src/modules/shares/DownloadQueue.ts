// IDEA: start download, gives download id (i++), and client polls/subscribes to that id

/**
 * UI you put id, it resolves, if collection, shows all items to select or adds just one item
 * backend system should just support adding multiple items to the queue
 * 
 */
// 

import { ChildWorkshopItem, ShareItemState, WorkshopItem } from "@srcpanel/common/Share"
import SteamAPI from "../steam.js"
import Share from "./Share.js"
import { join } from "node:path"
import { getChapterIds, serializeWorkshopItem } from "./ShareUtils.js"
import pLimit from "p-limit"


const QUEUE_MAX_CONCURRENT = 4
const DOWNLOAD_TIMEOUT_MS = 1000 * 60 * 10 // 10 min

export default class DownloadManager {
    #share: Share
    #id = 0
    #queue: Map<number, DownloadQueue> = new Map()

    constructor(share: Share) {
        this.#share = share
    }

    downloadWorkshopItems(items: WorkshopItem[]): DownloadQueue {
        const id = this.#id++

        const queue = new DownloadQueue(id, this.#share, new Set(items))

        this.#queue.set(id, queue)

        return queue
    }
}

export interface DownloadProgress {
    downloaded: number,
    total: number,
    state: DownloadState
}


// TODO: move to common
export enum DownloadState {
    /// Waiting to start downloading
    Pending,
    /// Currently downloading
    Downloading,
    Complete,
    Failed
}

export class DownloadQueue {
    #id: number
    #items: Map<WorkshopItem, DownloadProgress>
    #share: Share

    constructor(id: number, share: Share, items: Set<WorkshopItem>) {
        this.#id = id
        this.#share = share
        for(const item of items) {
            this.#items.set(item, {
                downloaded: 0,
                total: item.file_size,
                state: DownloadState.Pending
            })
        }
    }

    get id() { return this.#id }
    
    get allItemsComplete() {
        for(const progress of this.#items.values()) {
            if(progress.state == DownloadState.Pending || progress.state == DownloadState.Downloading) {
                return false
            }
        }
        return true
    }

    async start() {
        const limit = pLimit(QUEUE_MAX_CONCURRENT)
        const itemsList = [...this.#items.keys()]
        await Promise.all(itemsList.map(item => {
            return limit(() => this.#startDownload(item))
        })) 
    }

    async #startDownload(item: ChildWorkshopItem) {
        const filename = `${item.publishedfileid}.vpk`
    
        const event = SteamAPI.downloadItemProgress(item, this.#share.sourceFolder, { timeout: DOWNLOAD_TIMEOUT_MS })
        event.addListener("progress", (curBytes, totalBytes) => {
            const progress = this.#items.get(item)
            if(!progress) throw Error("Untracked item")
            progress.downloaded = curBytes
            //#this.items.set(item, progress)
        })
        event.addListener("finish", (curBytes, totalBytes) => {
            if (curBytes != item.file_size) {
                throw new Error(`Downloaded size mismatch (downloaded ${curBytes} bytes, expected ${item.file_size} bytes)`)
            }

            const chapterIds = getChapterIds(join(this.#share.sourceFolder, filename))
    
            this.#share.db.addAddon(filename, {
                filesize: item.file_size,
                lastModified: item.time_updated
                }, ShareItemState.Ready, { chapterIds })
            this.#share.db.addWorkshopInfo(filename, serializeWorkshopItem(item), item.collection)
        })
    }
}