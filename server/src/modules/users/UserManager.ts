import SteamID from 'steamid';
import SQL from 'sql-template-strings'
import SteamAPI from '../../modules/steam.js'
import { Pool, RowDataPacket } from 'mysql2/promise';

interface IUser extends RowDataPacket {
    steamid: string,
    name: string
}

export default class UserManager {
    private db: Pool
    private steam: SteamAPI

    constructor(pool: Pool, steam: SteamAPI) {
        this.db = pool
        this.steam = steam
    }

    async insert(user: IUser) {
        return await this.db.query(SQL`INSERT INTO users (steamid, name) VALUES (${user.steamid}, ${user.name})`)
    }

    // Returns a user if they exist
    async get(steamid: SteamID): Promise<IUser | undefined> {
        const steam64 = steamid.getSteamID64()
        const [users] = await this.db.execute<IUser[]>(SQL`SELECT * FROM users WHERE SUBSTRING(steamid, 11) = SUBSTRING(${steam64}, 11)`)
        return users[0]
    }

    // Gets a user, if they do not exist, fetches it
    async fetch(steamid: SteamID):Promise<IUser | undefined> {
        let user = await this.get(steamid)
        if(!user) {
            const steam64 = steamid.getSteamID64()
            const users = await this.steam.getUserDetails([steamid])
            if(users.length > 0) {
                user = {
                    steamid: steam64,
                    name: users[0].personaname
                } as IUser
                await this.insert(user)
            }
        }
        return user
    }

}
