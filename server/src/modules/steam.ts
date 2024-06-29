import SteamID from 'steamid'
import path from 'path';
import  { createWriteStream } from 'fs';
import { readFile } from 'fs/promises'
import https from 'https';
import { unlink } from 'fs/promises';
import { WorkshopItem, SteamUserDetails } from '../../../common-types/Share.js'
import { EventEmitter } from 'node:events';
import LruCache, { LRUCache } from 'lru-cache'

// How many bytes of progress to make before sending an update
const PROGRES_MIN_BYTES = 10_000 // 10KB
const ITEM_CACHE_MAX_SIZE = 20
const ITEM_CACHE_TTL = 1000 * 60 * 10 // 10 min

export default class SteamAPI {
    #apikey: string
    #userAgent: string
    #appMap: Record<string, string>
    #itemCache: LRUCache<string, WorkshopItem>

    public SteamAvailable: boolean = true

    constructor(apikey?: string, userAgent?: string) {
        this.#apikey = apikey ?? process.env.STEAM_WEB_APIKEY
        this.#userAgent = userAgent || "SrcdsDash-API-Client"
        this.#itemCache = new LRUCache({
            max: ITEM_CACHE_MAX_SIZE,
            ttl: ITEM_CACHE_TTL
        })
    }

    get UserAgent() { return this.#userAgent }
    set UserAgent(value: string) { this.#userAgent = value }

    get AppTitles() {
        return {...this.#appMap}
    }

    #checkKey() {
        if(!this.#apikey) {
            throw new Error("Missing steam api key. Provide in constructor or in env STEAM_WEB_APIKEY")
        }
    }

    public async loadAppIdFile(path: string) {
        const json = JSON.parse(await readFile(path, 'utf-8'))
        this.#appMap = {}
        for(const entry of json.apps) {
            if(entry.name != '') this.#appMap[entry.appid.toString()] = entry.name
        }
    }

    async getAppName(id: number) {
        if(!id) throw new Error("App id is null: " + id)
        if(!this.#appMap) throw new Error("App map is not initialized, use loadAppIdFile(path_to_db_file) to initalize")
        return this.#appMap[id.toString()]
    }

    async getUserDetails(steamids: (SteamID | string)[]): Promise<SteamUserDetails[]> {
        this.#checkKey()
        const ids = steamids.map(steamid => steamid instanceof SteamID ? steamid.getSteamID64() : steamid).slice(0, 100).join(",")
        const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.#apikey}&format=json&steamids=${ids}`, {
            headers: { 'User-Agent': this.#userAgent }
        })
        if(res.ok) {
            const json: any = await res.json()
            const users = json.response?.players
            if(users) {
                return users as SteamUserDetails[]
            }
            return null
        }
        // TODO: if down mark unavailable
        throw new Error(`${res.statusText}: ${await res.text()}`)
    }

    // Gets a collection's children items or null if is not a collection
    async getCollectionChildren(fileid: string): Promise<string[]> {
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
        return null
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
        if(index > 0) {
            // Don't waste a fetch if all items are in the cache
            const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.#userAgent
                },
                body: `itemcount=${fileids.length}&${params.toString()}`
            })
            if(response.ok) {
                const json = await response.json() as any
                const files = json.response.publishedfiledetails as WorkshopItem[]
                for(const file of files) {
                    this.#itemCache.set(file.publishedfileid, file)
                }
                details = [...details, ...files]
            } else {
                throw new Error(`${response.statusText}: ${await response.text()}`)
            }
        }
        return details
    }

    /**
     * Downloads a workshop item, resolves on completition
     * @param item The workshop item
     * @param destination The filepath to download the file to
     * @param requestOptions  Any options to send to https.get()
     * @param filenameTemplate How the file should be namedm variables: %ID%, %TITLE%. Default is %ID%.vpk
     * @returns Promise<number> - bytes written
     */
    static downloadItem(item: WorkshopItem, destination: string, requestOptions?: any, filenameTemplate: string = "%ID%.vpk"): Promise<number> {
        return new Promise((resolve, reject) => {
            const filename = filenameTemplate
                .replace(/%ID%/g, item.publishedfileid)
                .replace(/%TITLE%/g, item.title)
            const filepath = path.join(destination, filename)
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