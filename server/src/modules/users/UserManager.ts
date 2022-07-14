import SteamID from 'steamid';
import SQL from 'sql-template-strings'
import SteamAPI from '../../modules/steam.js'
import { Pool, RowDataPacket } from 'mysql2/promise';

interface IUserName extends RowDataPacket {
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

    async insertName(user: IUserName) {
        return await this.db.query(SQL`INSERT INTO user_names (steamid, name) VALUES (${user.steamid}, ${user.name})`)
    }

    // Returns a user if they exist
    async getName(steamid: SteamID): Promise<IUserName | undefined> {
        const steam64 = steamid.getSteamID64()
        const [users] = await this.db.execute<IUserName[]>(SQL`SELECT * FROM user_names WHERE SUBSTRING(steamid, 11) = SUBSTRING(${steam64}, 11)`)
        return users[0]
    }

    // Gets a user, if they do not exist, fetches it
    async fetchName(steamid: SteamID):Promise<IUserName | undefined> {
        let user = await this.getName(steamid)
        if(!user) {
            const steam64 = steamid.getSteamID64()
            const users = await this.steam.getUserDetails([steamid])
            if(users.length > 0) {
                user = {
                    steamid: steam64,
                    name: users[0].personaname
                } as IUserName
                await this.insertName(user)
            }
        }
        return user
    }

}
