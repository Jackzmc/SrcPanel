import sqlite from 'sqlite'
import sqlite3 from 'sqlite3';
import SteamID from 'steamid';
import SQL from 'sql-template-strings'
import SteamAPI from '../../modules/steam.js'

interface IUser {
    steamid: string,
    name: string
}

export default class UserManager {
    private db: sqlite.Database<sqlite3.Database, sqlite3.Statement>
    private steam: SteamAPI

    constructor(db: sqlite.Database<sqlite3.Database, sqlite3.Statement>) {
        this.db = db
        this.steam = new SteamAPI()
    }

    async insert(user: IUser) {
        return await this.db.run(SQL`INSERT INTO users (steamid, name) VALUES (${user.steamid}, ${user.name})`)
    }

    // Returns a user if they exist
    async get(steamid: SteamID) {
        return await this.db.get<IUser>(SQL`SELECT * FROM users WHERE SUBSTRING(steamid, 11) = SUBSTRING(${steamid}, 11)`)
    }

    // Gets a user, if they do not exist, fetches it
    async fetch(steamid: SteamID) {
        const steam64 = steamid.getSteamID64()
        let user = await this.db.get<IUser>(SQL`SELECT * FROM users WHERE SUBSTRING(steamid, 11) = SUBSTRING(${steam64}, 11)`)
        if(!user) {
            const users = await this.steam.getUserDetails([steamid])
            if(users.length > 0) {
                user = {
                    steamid: steam64,
                    name: users[0].personaname
                }
                await this.insert(user)
            }
        }
        return user
    }

}
