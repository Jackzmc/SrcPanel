import { Note } from "@srcpanel/common/Note";
import { RowDataPacket } from "mysql2";
import { ADMINS_DB, TABLE_PREFIX } from "../../core/index.js";
import { Pool } from "mysql2/promise";
import { formatNote } from "./utils.js";
import SteamID from "steamid";

export default class NotesManager {
    static #instance: NotesManager
    static get instance() { return this.#instance }
    #db: Pool

    constructor(db: Pool) {
        this.#db = db
        NotesManager.#instance = this
    }

    async getNote(id: number): Promise<Note | null> {
        const [notes] = await this.#db.execute<RowDataPacket[]>(
            `SELECT 
                notes.id, 
                notes.steamid, 
                notes.createdAt, 
                notes.markedBy, 
                notes.content, 
                u.last_name as user, 
                e.last_name as executor, 
                !b.expired as banned
            FROM notes
            LEFT JOIN view_${TABLE_PREFIX}_user as u ON SUBSTRING(notes.steamid, 11) = u.account_id
            LEFT JOIN view_${TABLE_PREFIX}_user as e ON SUBSTRING(notes.markedBy, 11) = e.account_id
            LEFT JOIN bans as b ON notes.steamid = b.steamid
            WHERE id = ?
            ORDER BY notes.id DESC`,
            [id]
        )
        return notes.length > 0 ? formatNote(notes[0]) : null
    }

    async getNotesForPlayer(steamid: SteamID, limit: number = 1000, page: number = 0): Promise<Note[]> {
        const offset = (page - 1) * limit
        const [notes] = await this.#db.execute<RowDataPacket[]>(
            `SELECT 
                notes.id, 
                notes.steamid, 
                notes.createdAt, 
                notes.markedBy, 
                notes.content, 
                u.last_name as user, 
                e.last_name as executor, 
                !b.expired as banned,
                (
                    SELECT COUNT(*) FROM \`${ADMINS_DB}\`.sm_admins 
                    WHERE \`${ADMINS_DB}\`.sm_admins.identity = notes.steamid
                ) as targetIsAdmin
            FROM notes
            LEFT JOIN view_${TABLE_PREFIX}_user u ON SUBSTRING(notes.steamid, 11) = u.account_id
            LEFT JOIN view_${TABLE_PREFIX}_user e ON SUBSTRING(notes.markedBy, 11) = e.account_id
            LEFT JOIN bans as b ON notes.steamid = b.steamid
            WHERE SUBSTRING(steamid, 11) = ? 
            ORDER BY notes.id DESC 
            LIMIT ?, ?`,
            [steamid.getSteam2RenderedID(), offset, limit]
        )

        return notes.map(formatNote)
    }
}