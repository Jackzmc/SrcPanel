import SteamID from 'steamid'
import fetch from 'node-fetch'

export default class SteamAPI {
    private apikey: string

    constructor(apikey?: string) {
        this.apikey = apikey ?? process.env.STEAM_WEB_APIKEY
    }

    async getUserDetails(steamids: SteamID[]): Promise<SteamUserDetails[]> {
        const ids = steamids.map(steamid => steamid.getSteamID64()).slice(0, 100).join(",")
        const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.apikey}&format=json&steamids=${ids}`)
        if(res.ok) {
            const json: any = await res.json()
            const users = json.response?.players
            if(users) {
                return users as SteamUserDetails[]
            }
        }
        return null
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
