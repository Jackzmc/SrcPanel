import SteamID from 'steamid';
import SQL from 'sql-template-strings'
import SteamAPI from '../../modules/steam.js'
import { Pool, RowDataPacket } from 'mysql2/promise';

interface IUserName extends RowDataPacket {
    steamid: string,
    name: string,
    avatarHash: string,
    timestamp?: number
}

export const STALE_USER_CACHE_TIME = 1000 * 60 * 60 * 14 // 14 days

export default class UserManager {
    private db: Pool
    private steam: SteamAPI

    constructor(pool: Pool, steam: SteamAPI) {
        this.db = pool
        this.steam = steam
    }

    async insertUser(user: IUserName) {
        return await this.db.query(SQL`INSERT INTO user_names (steamid, name, avatar_hash) VALUES (${user.steamid}, ${user.name}, ${user.avatarHash})`)
    }

    // Returns a user if they exist
    async getName(steamid: SteamID): Promise<IUserName | undefined> {
        const steamacct = steamid.getSteam2RenderedID()
        const [users] = await this.db.execute<IUserName[]>(SQL`SELECT * FROM user_names WHERE SUBSTRING(steamid, 11) = SUBSTRING(${steamacct}, 11)`)
        const user = users[0]
        if(!user) return null
        // Don't wait for the result, serve the stale data:
        if(Date.now() - user.timestamp > STALE_USER_CACHE_TIME) this.fetchName(steamid)
        return user
    }

    // Gets a user, if they do not exist, fetches it
    async fetchName(steamid: SteamID):Promise<IUserName | undefined> {
        let user = await this.getName(steamid)
        if(!user) {
            const users = await this.steam.getUserDetails([steamid])
            if(users.length > 0) {
                user = {
                    steamid: steamid.getSteam2RenderedID(),
                    name: users[0].personaname,
                    avatarHash: users[0].avatarhash
                } as IUserName
                await this.insertUser(user)
            }
        }
        return user
    }

}
