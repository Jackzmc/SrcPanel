import { Pool, RowDataPacket } from "mysql2/promise";
import SteamID from "steamid";
import UserManager from "./UserManager.js";
import { ADMINS_DB, TABLE_PREFIX } from "../../core/index.js";
import AuthManager from "../auth/AuthManager.js";
import { formatPlayer } from "./utils.js";
import PanelPlayer from "./Player.js";


export default class PlayerManager {
    static #instance: PlayerManager
    static get instance() { return this.#instance }
    #db: Pool
    #authMngr: AuthManager
    constructor(db: Pool, authMngr: AuthManager) {
        PlayerManager.#instance = this
        this.#db = db
        this.#authMngr = authMngr
    }

    async find(steamid: SteamID): Promise<PanelPlayer | null> {
        const steamid2 = steamid.getSteam2RenderedID()
        const [rows] = await this.#db.execute<RowDataPacket[]>(
        `SELECT
            account_id,
            u.last_name as name, 
            u.last_country as country, 
            u.last_region as region,
            u.ip,
            u.create_time as firstJoinDate, 
            u.last_join_time as lastJoinDate,
            server,
            (SELECT COUNT(*) FROM notes WHERE notes.steamid = client) as notesCount,
            (SELECT COUNT(*) FROM bans WHERE bans.steamid = client) as bansCount,
            (SELECT COUNT(*) FROM \`${ADMINS_DB}\`.sm_admins
                WHERE SUBSTRING(\`${ADMINS_DB}\`.sm_admins.identity,11) = SUBSTRING(client, 11)
                LIMIT 1
            ) as isAdmin
        FROM FROM view_${TABLE_PREFIX}_users u
        WHERE account_id = SUBSTRING(?, 11) 
        LIMIT 1`,
        [steamid2]
        )
        if(rows.length === 0) return null
        const player = formatPlayer(steamid, rows[0])
        return new PanelPlayer(this.#db, this.#authMngr, steamid, player)
    }

    async findPlayers(query: string, limit = 10): Promise<PanelPlayer[]> {
        const [rows] = await this.#db.execute<RowDataPacket[]>(
            `SELECT
                account_id,
                last_name,
                last_country,
                last_join_time,
                create_time,
                (SELECT COUNT(*) FROM notes WHERE SUBSTRING(notes.steamid,11) = u.account_id) as notesCount,
                (SELECT COUNT(*) FROM bans WHERE SUBSTRING(bans.steamid,11) = u.account_id) as bansCount,
                (SELECT COUNT(*) FROM ${ADMINS_DB}.sm_admins
                    WHERE SUBSTRING(${ADMINS_DB}.sm_admins.identity,11) = u.account_id
                ) as isAdmin
            FROM view_${TABLE_PREFIX}_users u
            WHERE SUBSTRING(steamid, 11) = SUBSTRING(:query, 11) 
                OR last_name LIKE CONCAT('%', :query, '%')
            ORDER BY last_join_time DESC
            LIMIT :limit`,
            { query, limit }
        )
        return rows.map(row => {
            const steamid = new SteamID(row.account_id)
            const playerData = formatPlayer(steamid, row)
            return new PanelPlayer(this.#db, this.#authMngr, steamid, playerData)
        })
    }
}