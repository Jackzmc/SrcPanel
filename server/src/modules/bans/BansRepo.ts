import { APIBanFlags, type APIBan, type APIBanAppeal, type BanAppeal, type ListAPIBan } from "@srcpanel/common/Ban";
import { TABLE_PREFIX, type DBClient } from "../../core/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { formatAppeal, formatBan } from "./utils.js";

export async function getBan(db: DBClient, banId: number): Promise<APIBan | null> {
    const [rows] = await db.execute<RowDataPacket[]>(`
        SELECT 
            b.id,
            b.timestamp,
            b.times_tried,
            b.flags,
            b.public_message,
            b.reason,
            b.expired,
            b.expires,
            b.ip,
            b.steamid,
            u1.last_name as client_name,
            b.executor,
            u2.last_name as executor_name
        FROM bans b
        LEFT JOIN view_${TABLE_PREFIX}_user ON u1 u1.account_id = SUBSTRING(steamid, 11)
        LEFT JOIN view_${TABLE_PREFIX}_user u2 ON u2.account_id = SUBSTRING(executor, 11)
        WHERE id = ? 
        LIMIT 1`,
        [ banId ]
    )

    return rows.length > 0 ? formatBan(rows[0], false) : null
}

export async function getBansForUser(db: DBClient, steamid: string, activeOnly = false): Promise<APIBan[]> {
    const [rows] = await db.execute<RowDataPacket[]>(`
        SELECT 
            b.id,
            b.timestamp,
            b.times_tried,
            b.flags,
            b.public_message,
            b.reason,
            b.expired,
            b.expires,
            b.ip,
            b.steamid,
            u1.last_name as client_name,
            b.executor,
            u2.last_name as executor_name
        FROM bans b
        LEFT JOIN view_${TABLE_PREFIX}_user ON u1 u1.account_id = SUBSTRING(steamid, 11)
        LEFT JOIN view_${TABLE_PREFIX}_user u2 ON u2.account_id = SUBSTRING(executor, 11)
        WHERE steamid = ?
        ${activeOnly ? `AND ~flags & ${APIBanFlags.Suspended}` : ''}
        `,
        [ steamid ]
    )
    return rows.map(ban => formatBan(ban, false))
}

export interface GetBanOptions {
    activeOnly?: boolean,
    expiredOnly?: boolean
    limit?: number,
    offset?: number,
}

export async function getBans(db: DBClient, options: GetBanOptions): Promise<ListAPIBan[]> {
    const [rows] = await db.execute<RowDataPacket[]>(`
        SELECT 
            b.id,
            b.timestamp,
            b.times_tried,
            b.flags,
            b.public_message,
            b.reason,
            b.expired,
            b.expires,
            b.ip,
            b.steamid,
            u1.last_name as client_name,
            (SELECT COUNT(*) FROM ban_appeals a WHERE a.ban_id = b.id) appeal_count,
            (SELECT COUNT(*) FROM notes n WHERE SUBSTRING(n.steamid, 11) = SUBSTRING(b.steamid, 11)) client_notes_count,
            b.executor,
            u2.last_name as executor_name
        FROM bans b
        LEFT JOIN view_${TABLE_PREFIX}_user u1 ON u1.account_id = SUBSTRING(steamid, 11)
        LEFT JOIN view_${TABLE_PREFIX}_user u2 ON u2.account_id = SUBSTRING(executor, 11)
        WHERE 1=1
        ${options.activeOnly ? `AND ~b.flags & ${APIBanFlags.Suspended}` : ''}
        ${options.expiredOnly ? 'AND b.expired = 0' : ''}
        ORDER BY b.timestamp DESC
        LIMIT ?, ?`,
        [ options.offset ?? 0, options.limit ?? 100 ]
    )
    return rows.map(ban => formatBan(ban, true))
}

/**
 * Get appeals for a specific ban
 * @param db 
 * @param banId 
 */
export async function getAppeals(db: DBClient, banId: number): Promise<APIBanAppeal[]> {
    const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT 
            id,
            state,
            message,
            ip,
            created,
            reject_reason,
            rejecter_id 
        FROM ban_appeals 
        WHERE ban_id = ?`,
        [ banId ]
    )
    return rows.map(formatAppeal)
}

/**
 * Get appeals for a specific ban
 * @param db 
 * @param banId 
 */
export async function getAppealsForUser(db: DBClient, steamid: string): Promise<APIBanAppeal[]> {
    const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT 
            id,
            state,
            message,
            ip,
            created,
            reject_reason,
            rejecter_id,
            bans.steamid
        FROM ban_appeals 
        LEFT JOIN bans ON ban_appeals.ban_id = bans.id
        WHERE bans.steamid = SUBSTRING(?, 11)`,
        [ steamid ]
    )
    return rows.map(formatAppeal)
}

export interface EditBanOptions {
    executor: string,
    reason: string,
    publicReason: string | null,
    flags: number,
    expires: number | null
}
export async function updateBan(db: DBClient, banId: number, options: EditBanOptions): Promise<boolean> {
    const [r] = await db.execute<ResultSetHeader>(`
        UPDATE bans 
        SET executor = :executor, reason = :reason, flags = :flags, 
        public_message = :public_message, expires = :expires 
        WHERE id = :id`,
        {
            executor: options.executor,
            reason: options.reason,
            flags: options.flags,
            public_message: options.publicReason,
            expires: options.expires,
            id: banId
        }
    )
    return r.affectedRows > 0
}

export interface InsertBanOptions {
    steamid: string,
    executor: string,
    reason: string,
    publicReason: string | null,
    flags?: number,
    expires: number | null
}
export async function insertBan(db: DBClient, options: InsertBanOptions): Promise<number> {
    const [ok] = await db.execute<ResultSetHeader>(
        `INSERT INTO bans (steamid, executor, reason, flags, public_message, expires, timestamp) 
        VALUES (:steamid, :executor, :reason, :flags, :public_message, :expires, UNIX_TIMESTAMP())`,
        {
            executor: options.executor,
            reason: options.reason ?? null,
            flags: options.flags ?? 0,
            public_message: options.publicReason ?? null,
            expires: options.expires ?? 0,
            steamid: options.steamid
        }
    )
    return ok.insertId
}

export async function deleteBan(db: DBClient, banId: number): Promise<boolean> {
    const [r] = await db.execute<ResultSetHeader>(
        `DELETE FROM bans WHERE id = ?`,
        [banId]
    )
    return r.affectedRows > 0
}

export async function insertBanAppeal(db: DBClient, banId: number, message: string, ip: string): Promise<number> {
    const [ok] = await db.execute<ResultSetHeader>(
      "INSERT INTO ban_appeals (ban_id, state, message, ip, created) VALUES (?, 0, ?, ?, UNIX_TIMESTAMP())",
      [banId, message, ip]
    )
    return ok.insertId
}