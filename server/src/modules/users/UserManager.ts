import SteamID from 'steamid';
import SQL from 'sql-template-strings'
import SteamAPI from '../../modules/steam.js'
import { Pool, RowDataPacket } from 'mysql2/promise';

interface IUserData {
    steamid: string,
    name: string,
    avatarHash: string,
    timestamp?: number
}

export const STALE_USER_CACHE_TIME = 1000 * 60 * 60 * 14 // 14 days

export default class UserManager {
    private static _instance: UserManager
    private db: Pool
    private steam: SteamAPI

    constructor(pool: Pool, steam: SteamAPI) {
        this.db = pool
        this.steam = steam
        UserManager._instance = this
    }

    public static get instance() {
        return UserManager._instance
    }

    async insertUser(user: IUserData) {
        return await this.db.query(SQL`INSERT INTO user_names (steamid, name, avatar_hash) VALUES (SUBSTRING(${user.steamid}, 11), ${user.name}, ${user.avatarHash})`)
    }

    // Returns a user if they exist
    async getUser(steamid: string): Promise<IUserData | undefined> {
        const [users] = await this.db.execute<RowDataPacket[]>(SQL`SELECT * FROM user_names WHERE steamid = SUBSTRING(${steamid}, 11)`)
        const user = users[0]
        if(!user) return null
        // Don't wait for the result, serve the stale data:
        if(Date.now() - user.timestamp > STALE_USER_CACHE_TIME) this.fetchUser(steamid)
        return {
            steamid: user.steamid,
            avatarHash: user.avatar_hash,
            name: user.namee,
            timestamp: user.timestamp
        }
    }

    // Gets a user, if they do not exist, fetches it
    async fetchUser(steamid: string):Promise<IUserData | undefined> {
        let user = await this.getUser(steamid)
        if(!user) {
            const users = await this.steam.getUserDetails([steamid])
            if(users.length > 0) {
                user = {
                    steamid: steamid,
                    name: users[0].personaname,
                    avatarHash: users[0].avatarhash
                } as IUserData
                await this.insertUser(user)
            }
        }
        return user
    }

    /**
     * Fetches in bulk users from steam API. Does not grab any from cache
     * @param {SteamID} steamids - List of steamids instances or steamid64 strings
     * @returns {Promise<IUserData[]>}
     */
    async fetchUsers(steamids: (SteamID|string)[]): Promise<IUserData[]> {
        if(steamids.length > 100) throw new Error("Too many ids, steam API only supports 100")
        const expUsers = []
        const insertPromises = []
        const users = await this.steam.getUserDetails(steamids)
        for(const user of users) {
            const expUser = {
                // We use the right side of STEAM_#:#:#####
                steamid: new SteamID(user.steamid).getSteam2RenderedID().slice(10),
                name: user.personaname,
                avatarHash: user.avatarhash
            }
            expUsers.push(expUser)
            insertPromises.push(this.insertUser(expUser))
        }
        try {
            await Promise.allSettled(insertPromises)
        } catch(err) {
            console.warn("[UserManager] Error inserting users:", err)
        }
        return expUsers
    }

    // Gets a user's name from stats table
    async getStatsName(steamid: string): Promise<string | undefined> {
        const [rows] = await this.db.execute<RowDataPacket[]>(
            "SELECT last_alias FROM stats_users WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)",
            [steamid]
        )
        return rows.length > 0 ? rows[0].last_alias : undefined
    }

}
