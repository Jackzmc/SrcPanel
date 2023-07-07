import SteamID from 'steamid'
import fetch from 'node-fetch'
import path from 'path';
import  { createWriteStream } from 'fs';
import { readFile } from 'fs/promises'
import https from 'https';
import { unlink } from 'fs/promises';
import { WorkshopItem, SteamUserDetails } from '../../../common-types/Share.js'

export default class SteamAPI {
    private apikey: string
    private userAgent: string
    private appMap: Record<string, string>

    constructor(apikey?: string, userAgent?: string) {
        this.apikey = apikey ?? process.env.STEAM_WEB_APIKEY
        this.userAgent = userAgent || "SrcdsDash-API-Client"
    }

    private _key_check() {
        if(!this.apikey) {
            throw new Error("Missing steam api key. Provide in constructor or in env STEAM_WEB_APIKEY")
        }
    }

    public async loadAppIdFile(path: string) {
        const json = JSON.parse(await readFile(path, 'utf-8'))
        this.appMap = {}
        for(const entry of json.apps) {
            if(entry.name != '') this.appMap[entry.appid.toString()] = entry.name
        }
    }

    async getAppName(id: number) {
        if(!id) throw new Error("App id is null: " + id)
        if(!this.appMap) throw new Error("App map is not initialized, use loadAppIdFile(path_to_db_file) to initalize")
        return this.appMap[id.toString()]
    }

    async getUserDetails(steamids: (SteamID | string)[]): Promise<SteamUserDetails[]> {
        this._key_check()
        const ids = steamids.map(steamid => steamid instanceof SteamID ? steamid.getSteamID64() : steamid).slice(0, 100).join(",")
        const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.apikey}&format=json&steamids=${ids}`, {
            headers: { 'User-Agent': this.userAgent }
        })
        if(res.ok) {
            const json: any = await res.json()
            const users = json.response?.players
            if(users) {
                return users as SteamUserDetails[]
            }
            return null
        }
        throw new Error(`${res.statusText}: ${await res.text()}`)
    }

    // Gets a collection's children items or null if is not a collection
    async getCollectionChildren(fileid: string): Promise<string[]> {
        
        const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': this.userAgent
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
        const data = fileids.map((fileid, index) => {
            return `publishedfileids[${index}]=${fileid}`
        }).join("&")
        const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': this.userAgent
            },
            body: `itemcount=${fileids.length}&${data}`
        })
        if(response.ok) {
            const json = await response.json() as any
            console.log('RES', JSON.stringify(json['response']['publishedfiledetails']))
            return json['response']['publishedfiledetails'];
        }
        throw new Error(`${response.statusText}: ${await response.text()}`)
    }

    static downloadItem(item: WorkshopItem, destination: string, requestOptions?: any, filenameTemplate: string = "%ID%.vpk"): Promise<number> {
        return new Promise((resolve, reject) => {
            const filename = filenameTemplate
                .replace(/%ID%/, item.publishedfileid)
                .replace(/%TITLE%/, item.title)
            const filepath = path.join(destination, filename)
            const file = createWriteStream(filepath)
            console.log(item.file_url)
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

}