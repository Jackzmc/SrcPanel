import SteamID from 'steamid'
import path from 'path';
import  { createWriteStream } from 'fs';
import { readFile } from 'fs/promises'
import https from 'https';
import { unlink } from 'fs/promises';
import { WorkshopItem, SteamUserDetails } from '../../../common-types/Share.js'
import { EventEmitter } from 'node:events';
import QuickLRU from 'quick-lru';
import logger from '../logger.js'
import { Database, open as sqliteOpen } from 'sqlite'
import sqlite3 from 'sqlite3';
import { join } from 'node:path';
import SQL from 'sql-template-strings';
const log = logger.child({ name: "steam" })

// How many bytes of progress to make before sending an update
const PROGRES_MIN_BYTES = 10_000 // 10KB
const ITEM_CACHE_MAX_SIZE = 20
const ITEM_CACHE_TTL = 1000 * 60 * 10 // 10 min

export type WSResolveCallback = (workshopInfo: WorkshopItem | null) => void

export class SteamAPIError extends Error {
    status: number
    statusText: string|undefined

    /**
     * Throw this error if response.ok is false, returning either JSON error code or raw text
     * @param response 
     */
    static async throwIfResponseError(response: Response, logData?: object) {
        if(!response.ok) {
            let message: string = "";

            if(!response.bodyUsed) {
                if(response.headers.get("content-type")?.includes("application/json")) {
                    const json = await response.json()
                    message = `${json.error}: ${json.message}`
                } else {
                    const text = await response.text()
                    message = text
                }
            }

            if(!message) message = "Unknown error"

            log.warn({
                status: response.status,
                statusText: response.statusText,
                ...logData
            }, message)

            throw new SteamAPIError(message, response.status, response.statusText)
        }
    }

    constructor(message: string, httpCode: number, httpMessage?: string) {
        super(message)
        this.status = httpCode
        this.statusText = httpMessage
    }
}

export default class SteamAPI {
    #apikey: string
    #userAgent: string
    #itemCache: QuickLRU<string, WorkshopItem>
    #workshopResolveQueue: Record<string, WSResolveCallback> = {}
    #db: Database

    public SteamAvailable: boolean = true

    constructor(apikey?: string, userAgent?: string) {
        apikey = apikey ?? process.env.STEAM_WEB_APIKEY
        if(!apikey) throw new Error("Missing env STEAM_WEB_APIKEY")
        this.#apikey = apikey
        this.#userAgent = userAgent || "SrcdsDash-API-Client"
        this.#itemCache = new QuickLRU({
            maxSize: ITEM_CACHE_MAX_SIZE,
            maxAge: ITEM_CACHE_TTL
        })
    }

    get UserAgent() { return this.#userAgent }
    set UserAgent(value: string) { this.#userAgent = value }

    #checkKey() {
        if(!this.#apikey) {
            throw new Error("Missing steam api key. Provide in constructor or in env STEAM_WEB_APIKEY")
        }
    }

    /** Initalizes a cache for appids */
    public async InitCache(cacheFolder: string) {
        const filename = join(cacheFolder, 'steam.db')
        try {
            const db = await sqliteOpen({
                filename,
                driver: sqlite3.Database
            })
            await db.exec(SQL`CREATE TABLE IF NOT EXISTS appids (
                appid INT NOT NULL,
                title TEXT NOT NULL,
                fetch_date INT NOT NULL,
                PRIMARY KEY(appid)
            );`)
            this.#db = db
            log.info("cache ready")
        } catch(err) {
            throw new Error(`Failed to initalize cache at ${filename}`, { cause: err })
        }
    }

    async getAppName(id: number) {
        if(!id) throw new Error("App id is null: " + id)
        if(!this.#db) throw new Error("Cache hasn't been initalized. Call .InitCache()")
        const result = await this.#db.get("SELECT title FROM appids WHERE appid = ?", [ id ])  
        let name = result?.title
        if(!name) {
            log.debug({ id }, "fetching app name from steam")
            name = await this.#fetchAppName(id)            
        }
        return name
    }

    async #fetchAppName(id: number) {
        const res = await fetch(`https://store.steampowered.com/api/appdetails?format=json&appids=${id}`, {
            headers: { 'User-Agent': this.#userAgent }
        })
        if(res.ok) {
            const json = await res.json()
            const entry = json[id]
            if(entry?.success) {
                const unixTs = Math.round(Date.now()/1000)
                log.debug([id, entry.data.name, unixTs], "insert into appids (appid,title,fetch_date) VALUES (?,?,?)")
                await this.#db.run("insert into appids (appid,title,fetch_date) VALUES (?,?,?)", [id, entry.data.name, unixTs])
                return entry.data.name
            }
        }
        await SteamAPIError.throwIfResponseError(res, { fn: "fetchAppName", id })
        throw new SteamAPIError("unexpected response from steam", 500)
    }

    async getUserDetails(steamids: (SteamID | string)[]): Promise<SteamUserDetails[]> {
        this.#checkKey()
        const ids = steamids.map(steamid => steamid instanceof SteamID ? steamid.getSteamID64() : steamid).slice(0, 100).join(",")
        log.debug(`GetPlayerSummaries ids=${ids}`)
        const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.#apikey}&format=json&steamids=${ids}`, {
            headers: { 'User-Agent': this.#userAgent }
        })
        await SteamAPIError.throwIfResponseError(res, { fn: "getUserDetails", ids })

        const json: any = await res.json()
        const users = json.response?.players
        if(users) {
            return users as SteamUserDetails[]
        }
        log.warn(`GetUserDetails: Invalid data`, json)
        // TODO: verify if this is a problem:
        throw new Error("API Did not return player data")
    }

    /** Get a single user's information */
    async getUserDetail(steamid: SteamID|string): Promise<SteamUserDetails> {
        const details = await this.getUserDetails([steamid])
        if(details.length === 0) throw new SteamAPIError("Invalid response returned, no users details given", 500, "")
        return details[0]
    }

    // Gets a collection's children items or null if is not a collection
    async getCollectionChildren(fileid: string): Promise<string[]|null> {
        log.trace("getCollectionChildren %s", fileid)
        const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': this.#userAgent
            },
            body: `collectioncount=1&publishedfileids[0]=${fileid}`
        })
        if(response.ok) {
            const json = await response.json() as any
            if(json.response.resultcount > 0) {
                return json.response.collectiondetails[0].children
                    .map(child => child.publishedfileid)
            }
        }
        log.trace("getCollectionChildren %s not a collection", fileid)
        return null
    }

    async searchItems(query: string, appid: string): Promise<WorkshopItem[]> {
        this.#checkKey()
        const params = new URLSearchParams()
        params.append("appid", appid)
        params.append("key", this.#apikey)
        params.append("numperpage", "30")
        params.append("return_metadata", "1")
        params.append("search_text", query)
        log.trace({ fn: "searchItems", appid, query })
        const response = await fetch("https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/", {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': this.#userAgent
            },
            body: `?${params.toString()}`
        })
        await SteamAPIError.throwIfResponseError(response, { fn: "searchItems", appid, query })

        const json = await response.json() as any
        const details = json.response.publishedfiledetails as WorkshopItem[]
        for(const file of details) {
            this.#itemCache.set(file.publishedfileid, file)
        }
        return details
    }


    async getItemDetails(fileids: string[]): Promise<WorkshopItem[]> {
        let details: WorkshopItem[] = []
        const params = new URLSearchParams()
        let index = 0
        for(const fileid of fileids) {
            // Grab items from cache if they exist and don't add them to fetch
            const detail = this.#itemCache.get(fileid)
            if(detail) details.push(detail)
            else params.append(`publishedfileids[${index++}]`, fileid)
        }
        log.trace({ fn: "getItemDetails", params: params })
        // Don't waste a fetch if all items are in the cache
        if(index > 0) {
            // Don't waste a fetch if all items are in the cache
            // console.log(`itemcount=${fileids.length}&${params.toString()}`)
            const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.#userAgent
                },
                body: `itemcount=${index}&${params.toString()}`
            })

            await SteamAPIError.throwIfResponseError(response, { fn: "getItemDetails", params })

            const json = await response.json() as any
            const files = json.response.publishedfiledetails as WorkshopItem[]
            for(const file of files) {
                this.#itemCache.set(file.publishedfileid, file)
            }
            details = [...details, ...files]
            log.trace({fn: "getItemDetails", details })
        }
        return details
    }

    addToWSResolveQueue(workshopId: number, cb: WSResolveCallback) {
        if(isNaN(workshopId)) throw new Error("Workshop id must be a number")
        if(this.#itemCache[workshopId]) {
            log.trace({ fn: "addToWSResolveQueue", workshopId, state: "resolved"})
            cb(this.#itemCache[workshopId])
            return
        }
        this.#workshopResolveQueue[workshopId] = cb
        log.trace({ fn: "addToWSResolveQueue", workshopId, state: "queued"})
    }

    async resolveWSQueue() {
        const ids = Object.keys(this.#workshopResolveQueue)
        if(ids.length === 0) return
        while(ids.length > 0) {
            const itemIds = ids.splice(0, 100)
            log.trace({ fn: "resolveWSQueue", itemIds, state: "processing"})
            const items = await this.getItemDetails(itemIds)
            for(const item of items) {
                const callback = this.#workshopResolveQueue[item.publishedfileid]
                if(!callback) continue
                callback(item)
                delete this.#workshopResolveQueue[item.publishedfileid]
            }
            // Check if we missed any item ids from our slice
            for(const id of itemIds) {
                const callback = this.#workshopResolveQueue[id]
                if(callback) {
                    log.error("resolveWSQueue: Did not get data for %s", id)
                    callback(null)
                }
                delete this.#workshopResolveQueue[id]
            }
        }
    }

    /**
     * Downloads a workshop item, resolves on completition
     * @param item The workshop item
     * @param destFolder The filepath to download the file to
     * @param requestOptions  Any options to send to https.get()
     * @param filenameTemplate How the file should be namedm variables: %ID%, %TITLE%. Default is %ID%.vpk
     * @returns Promise<number> - bytes written
     */
    static downloadItem(item: WorkshopItem, destFolder: string, requestOptions?: any, filenameTemplate: string = "%ID%.vpk"): Promise<number> {
        return new Promise((resolve, reject) => {
            const filename = filenameTemplate
                .replace(/%ID%/g, item.publishedfileid)
                .replace(/%TITLE%/g, item.title)
            const filepath = path.join(destFolder, filename)
            const file = createWriteStream(filepath)
            https.get(item.file_url, requestOptions, (response) => {
                file.on('finish', () => {
                    file.close(() => {
                        resolve(file.bytesWritten)
                    })
                })
                response.pipe(file)
            }).on('error', (err) => {
                unlink(filepath)
                reject(err)
            })
        })
    }

    /**
     * Downloads a workshop item, and emits a "progress" event with data (bytesWritten, bytesTotal) periodically. Emits "finish" on completion
     * @param item The workshop item
     * @param destination The filepath to download the file to
     * @param requestOptions  Any options to send to https.get()
     * @param filenameTemplate How the file should be namedm variables: %ID%, %TITLE%. Default is %ID%.vpk
     * @returns EventEmitter
     */
    static downloadItemProgress(item: WorkshopItem, destination: string, requestOptions?: any, filenameTemplate: string = "%ID%.vpk"): EventEmitter {
        const event = new EventEmitter()
        const filename = filenameTemplate
            .replace(/%ID%/g, item.publishedfileid)
            .replace(/%TITLE%/g, item.title)
        const filepath = path.join(destination, filename)
        const file = createWriteStream(filepath)
        https.get(item.file_url, requestOptions, (response) => {
            const contentLength = Number(response.headers['content-length'])
            file.on('finish', () => {
                file.close(() => {
                    event.emit("finish", file.bytesWritten, contentLength)
                    event.removeAllListeners()
                })
            })
            let progressBytes = 0, lastProgress = Date.now()
            response.on('data', (chunk) => {
                // Only send updates every PROGRES_MIN_BYTES bytes 
                progressBytes += chunk.length
                if(progressBytes > PROGRES_MIN_BYTES && Date.now() - lastProgress > 2000) {
                    progressBytes = 0
                    lastProgress = Date.now()
                    event.emit("progress", file.bytesWritten, contentLength)
                }
            })
            response.pipe(file)
        }).on('error', (err) => {
            unlink(filepath)
            event.emit("error", err)
        })
        return event
    }

}