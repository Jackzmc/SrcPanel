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
    static #instance: UserManager
    #db: Pool
    #steam: SteamAPI

    constructor(pool: Pool, steam: SteamAPI) {
        this.#db = pool
        this.#steam = steam
        UserManager.#instance = this
    }

    public static get instance() {
        return UserManager.#instance
    }

    public static isSteamID2(input: string) {
        return /STEAM_\d:\d:\d+/.test(input)
    }

    /**
     * Adds user data to the user name cache
     * @param user user data
     * @returns 
     */
    async insertUser(user: IUserData) {
        if(user.steamid.length <= 10) throw new Error("steamid is invalid (bad length)")
        // return await this.#db.query(SQL`INSERT INTO user_names (steamid, name, avatar_hash) VALUES (SUBSTRING(${user.steamid}, 11), ${user.name}, ${user.avatarHash})`)
    }

    async updateUser(user: IUserData) {
        if(user.steamid.length <= 10) throw new Error("steamid is invalid (bad length)")
        const accountId = user.steamid.substring(10)
        return await this.#db.query(SQL`UPDATE user_names SET name = ${user.name}, avatar_hash = ${user.avatarHash} WHERE steamid = ${accountId}`)
    }

    /**
     * Returns a user from user name cache if they exist. Queues background update if data is stale (returning the stale data)
     * Returns null instantly if not a steamID
     * @param steamid Steamid2
     * @returns 
     */
    async getUser(steamid: string): Promise<IUserData | null> {
        if(!steamid || !UserManager.isSteamID2(steamid)) return null
        const user = await this.getUserDirect(steamid)
        // Don't wait for the result, serve the stale data:
        if(user && (!user.timestamp || Date.now() - user.timestamp > STALE_USER_CACHE_TIME)) this.fetchUser(new SteamID(steamid))
        return user
    }

    private async getUserDirect(steamid: string): Promise<IUserData|null> {
        const [users] = await this.#db.execute<RowDataPacket[]>(SQL`SELECT * FROM user_names WHERE steamid = SUBSTRING(${steamid}, 11)`)
        const user = users[0]
        if(user) {
            return {
                steamid: user.steamid,
                avatarHash: user.avatar_hash,
                name: user.name,
                timestamp: user.timestamp
            }
        }
        return null
    }

    /**
     * Gets a user, fetching their steam details if not cached
     * @param steamid The steamid
     * @param force force bypass cache fetching latest info
     * @returns 
     */
    async fetchUser(steamid: SteamID, force = false): Promise<IUserData | null> {
        const steamid2 = steamid.getSteam2RenderedID()
        let user = await this.getUserDirect(steamid2)
        const hasPrevious = user != undefined
        if(!user || force) {
            const users = await this.#steam.getUserDetails([ steamid ])
            if(users.length > 0) {
                user = {
                    steamid: steamid2,
                    name: users[0].personaname,
                    avatarHash: users[0].avatarhash
                } as IUserData
                // TODO: is inserting new
                if(hasPrevious)
                    await this.updateUser(user)
                else
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
    async fetchUsers(steamids: (SteamID)[]): Promise<IUserData[]> {
        if(steamids.length > 100) throw new Error("Too many ids, steam API only supports 100")
        const expUsers: IUserData[] = []
        const insertPromises: Promise<void>[] = []
        const users = await this.#steam.getUserDetails(steamids)
        if(!users) return []
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

    /**
     * Get a user's name from the l4d2 stats plugin's table
     * @param steamid 
     * @returns 
     */
    async getStatsName(steamid: string): Promise<string | undefined> {
        const [rows] = await this.#db.execute<RowDataPacket[]>(
            "SELECT last_alias FROM stats_users WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)",
            [steamid]
        )
        return rows.length > 0 ? rows[0].last_alias : undefined
    }

}
