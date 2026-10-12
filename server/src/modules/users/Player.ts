import { Pool, RowDataPacket } from "mysql2/promise";
import SteamID from "steamid";
import { OauthProvider, PlayerEntry } from "@srcpanel/common/User";
import { FullAPIBan } from "@srcpanel/common/Ban";
import { TABLE_PREFIX } from "../../core/index.js";
import AuthManager from "../auth/AuthManager.js";
import { Note } from "@srcpanel/common/Note";
import { formatBan } from "../bans/utils.js";
import NotesManager from "../notes/index.js";

export default class PanelPlayer {
    #db: Pool
    #steamid: SteamID
    #player: PlayerEntry
    #authMngr: AuthManager
    constructor(db: Pool, authMngr: AuthManager, steamid: SteamID, player: PlayerEntry) {
        this.#db = db
        this.#authMngr = authMngr
        this.#steamid = steamid
        this.#player = player
    }

    get steamid(): SteamID { return this.#steamid }
    get steamid2(): string { return this.#steamid.getSteam2RenderedID() }

    get entry() { return this.#player }

    async getNotes(limit: number = 1000, page: number = 0): Promise<Note[]> {
        return NotesManager.instance.getNotesForPlayer(this.steamid, limit, page)
    }

    async getBans(): Promise<FullAPIBan[]> {
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


