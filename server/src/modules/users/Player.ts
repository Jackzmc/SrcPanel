import { Pool, RowDataPacket } from "mysql2/promise";
import SteamID from "steamid";
import { OauthProvider, PlayerEntry } from "@srcpanel/common/User";
import { FullAPIBan } from "@srcpanel/common/Ban";
import { ADMINS_DB, TABLE_PREFIX } from "../../core/index.js";
import AuthManager from "../auth/AuthManager.js";
import { Note } from "@srcpanel/common/Note";
import { formatBan } from "../bans/utils.js";
import NotesManager from "../notes/index.js";
import { formatPlayer } from "./utils.js";

/**
 * determine:
 * [A] fetch player always but just rely on cache
 * [B] make you getEntry() and it can fail if no player?
 */
export default class PanelPlayer {
    #db: Pool
    #steamid: SteamID
    #cachedEntry?: PlayerEntry
    #authMngr: AuthManager
    constructor(db: Pool, authMngr: AuthManager, steamid: SteamID, player?: PlayerEntry) {
        this.#db = db
        this.#authMngr = authMngr
        this.#steamid = steamid
        this.#cachedEntry = player
    }

    get steamid(): SteamID { return this.#steamid }
    get steamid2(): string { return this.#steamid.getSteam2RenderedID() }

    get cachedEntry() { return this.#cachedEntry }

    async getEntry(cached = true): Promise<PlayerEntry> {
        if(!this.#cachedEntry || !cached) {
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
                [this.steamid2]
            )
            // TODO: is this okay? we don't want to have to fetch an entry if its not actually used (but rather calling getBans)
            if(rows.length === 0) throw new Error("No player found")
            this.#cachedEntry = formatPlayer(this.steamid, rows[0])
        }
        return this.#cachedEntry
    }

    /**
     * Return list of notes for player
     * @param limit 
     * @param page page to access, starting at 1
     * @returns 
     */
    async getNotes(limit: number = 1000, page: number = 1): Promise<Note[]> {
        return NotesManager.instance.getNotesForPlayer(this.steamid, limit, page)
    }

    async getBans(): Promise<FullAPIBan[]> {
        // TODO: BansManager
        const [bans] = await this.#db.execute<RowDataPacket[]>(
            `SELECT 
                id, 
                times_tried, 
                public_message, 
                bans.flags, 
                bans.steamid, 
                bans.executor, 
                bans.reason, 
                ip
                expires, 
                expired, 
                bans.timestamp, 
                u1.last_name as client_name, 
                u1.last_country as client_country, 
                u2.last_name AS executor_name, 
            FROM bans
            LEFT JOIN view_${TABLE_PREFIX}_user AS u1 ON SUBSTRING(bans.steamid, 11) = u1.account_id
            LEFT JOIN view_${TABLE_PREFIX}_user AS u2 ON SUBSTRING(bans.executor, 11) = u2.account_id
            WHERE SUBSTRING(bans.steamid, 11) = SUBSTRING(?, 11)`,
            [this.steamid2]
      )
      
      const formattedBans = bans.map(formatBan)
      // Fetch provider name if necessary
      for(const ban of formattedBans) {
        if(ban.executor.nameResolver === "provider" && ban.executor.provider) {
            ban.executor.name = await this.#authMngr.getNameFromProvider(ban.executor.provider as OauthProvider, ban.executor.id)
        }
      }

      return formattedBans
    }
}


