import SteamID from 'steamid'
import fetch from 'node-fetch'
import path from 'path';
import  { createWriteStream } from 'fs';
import https from 'https';
import { unlink } from 'fs/promises';

export default class SteamAPI {
    private apikey: string
    private userAgent: string

    constructor(apikey?: string, userAgent?: string) {
        this.apikey = apikey ?? process.env.STEAM_WEB_APIKEY
        this.userAgent = userAgent || "SrcdsDash-API-Client"
    }

    async getUserDetails(steamids: SteamID[]): Promise<SteamUserDetails[]> {
        const ids = steamids.map(steamid => steamid.getSteamID64()).slice(0, 100).join(",")
        const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.apikey}&format=json&steamids=${ids}`, {
            headers: { 'User-Agent': this.userAgent }
        })
        if(res.ok) {
            const json: any = await res.json()
            const users = json.response?.players
            if(users) {
                return users as SteamUserDetails[]
            }
        }
        return null
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
            return json['response']['publishedfiledetails'];
        }
        throw new Error(`${response.statusText}: ${await response.text()}`)
    }

    downloadItem(item: WorkshopItem, destination: string, filenameTemplate: string = "%ID%.vpk"): Promise<number> {
        return new Promise((resolve, reject) => {
            const filename = filenameTemplate
                .replace(/%ID%/, item.publishedfileid)
                .replace(/%TITLE%/, item.title)
            const filepath = path.join(destination, filename)
            const file = createWriteStream(filepath)
            https.get(item.file_url, (response) => {
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

export interface SteamUserDetails {
    steamid: string;
    communityvisibilitystate: number;
    profilestate: number;
    personaname: string;
    profileurl: string;
    avatar: string;
    avatarmedium: string;
    avatarfull: string;
    avatarhash: string;
    lastlogoff: number;
    personastate: number;
    primaryclanid: string;
    timecreated: number;
    personastateflags: number;
    loccountrycode: string;
    locstatecode: string;
}

export interface WorkshopItem {
    result: number,
    publishedfileid: string,
    creator: string,
    creator_app_id: number,
    consumer_app_id: number,
    filename: string,
    file_size: number,
    file_url: string,
    preview_url: string,
    hcontent_preview: string,
    title: string,
    description: string,
    time_created: number,
    time_updated: number,
    subscriptions: number,
    favorited: number,
    views: number,
    tags: {
        tag: string
    }[]
}