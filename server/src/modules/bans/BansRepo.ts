import type { APIBan, APIBanAppeal, BanAppeal } from "@srcpanel/common/Ban";
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

    return rows.length > 0 ? formatBan(rows[0]) : null
}

export async function getBanForUser(db: DBClient, steamid: string): Promise<APIBan[]> {
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
        WHERE steamid = ?`,
        [ steamid ]
    )
    return rows.map(formatBan)
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
export async function updateBan(db: DBClient, banId: number, options: EditBanOptions): Promise<void> {
    await db.execute<ResultSetHeader>(`
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

export async function deleteBan(db: DBClient, banId: number): Promise<void> {
    await db.execute<ResultSetHeader>(
        `DELETE FROM bans WHERE id = ?`,
        [banId]
    )
}