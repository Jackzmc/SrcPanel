import type { Note } from "@srcpanel/common/Note"
import { ADMINS_DB, TABLE_PREFIX, type DBClient } from "../../core/database.js"
import { formatNote } from "./index.js"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import type { APIListNotesQuery } from "@srcpanel/common/notes/schemas"
import { QueryBuilder } from "../QueryBuilder.js"
import PlayerManager from "../users/PlayerManager.js"
import SteamID from "steamid"

export async function getNote(db: DBClient, id: number): Promise<Note | null> {
    const [notes] = await db.execute<RowDataPacket[]>(
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
        LIMIT 1`,
        [id]
    )
    return notes.length > 0 ? formatNote(notes[0]) : null
}

export async function getNotesForPlayer(db: DBClient, userSteamId: string, limit: number = 1000, page: number = 0): Promise<Note[]> {
    const offset = (page - 1) * limit
    const [notes] = await db.execute<RowDataPacket[]>(
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
        [ userSteamId, offset, limit]
    )

    return notes.map(formatNote)
}

export async function getNotes(db: DBClient, options: APIListNotesQuery = {}) {
    if(!options.page || options.page <= 0) options.page = 1
    if(!options.limit || options.limit <= 0) options.limit = 100

    const offset = (options.page - 1) * options.limit;

    const query = QueryBuilder.startSelect("notes")
        .select("notes.id")
        .select("notes.steamid")
        .select("notes.createdAt")
        .select("notes.markedBy")
        .select("notes.content")
        .select("u1.last_name", "executor")
        .select("u2.last_name", "user")
        .selectRaw("!bans.expired", "banned")
        .selectSubQuery(`SELECT COUNT(*) FROM ${ADMINS_DB}.sm_admins WHERE ${ADMINS_DB}.sm_admins.identity = notes.steamid`, "targetIsAdmin")
        .leftJoin(`view_${TABLE_PREFIX}_user`, "account_id", "=", "SUBSTRING(steamid, 11)", "u1", true)
        .leftJoin(`view_${TABLE_PREFIX}_user`, "account_id", "=", "SUBSTRING(markedBy, 11)", "u2", true)
        .leftJoin("bans", "steamid", "=", "notes.steamid", undefined, true)
        .limit(options.limit, offset)
    
    if(options.search_content) query.where("content", "LIKE", `%${options.search_content}%`)
    if(options.search_user) {
        query.where("steamid", "LIKE", `%${options.search_user}%`)
        query.where("user", "LIKE", `%${options.search_user}%`)
    }

    const [rawNotes] = await query.execute(db)
    const notes = rawNotes.map(formatNote) 

    // If we make a NotesManager, this should be moved there
    // Put any missing names in queue to be resolved
    notes.filter(note => note.client.id.startsWith("STEAMID") && !note.client.name)
        .forEach(note => PlayerManager.instance.enqueueNameResolve(new SteamID(note.client.id)))

    return notes
}

export async function createNote(db: DBClient, targetSteamId: string, creatorSteamId: string, content: string): Promise<number> {
    const [r] = await db.execute<ResultSetHeader>(`
        INSERT INTO notes (steamid, markedBy, content)
        VALUES (:steamid, :markedBy, :content)`,
        {
            content: content,
            steamid: targetSteamId,
            markedBy: creatorSteamId
        }
    )
    return r.insertId
}

export async function updateNote(db: DBClient, id: number, newContent: string): Promise<void> {
    await db.execute<ResultSetHeader>(`
        UPDATE notes
        SET content = ?
        WHERE id = ?`,
        [ newContent, id ]
    )
}

export async function deleteNote(db: DBClient, id: number): Promise<void> {
    await db.execute<ResultSetHeader>(`
        DELETE notes
        WHERE id = ?`,
        [ id ]
    )
}
