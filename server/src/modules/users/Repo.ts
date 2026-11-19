import type SteamID from "steamid";
import type { DBClient } from "../../core/database.js";
import { ResultSetHeader } from "mysql2";

export interface CreateUserOptions {
    lastJoinTime?: number,
    lastIp?: number,
    lastCountry?: string,
    lastRegion?: string,
    avatarHash?: string
}
export async function insertUser(db: DBClient, steamid: SteamID, options: CreateUserOptions = {}): Promise<boolean> {
    const [r] = await db.execute<ResultSetHeader>(
        `INSERT INTO panel_user (steamid_slice, last_join_time, last_ip, last_country, last_region, avatar_hash)
        VALUES (SUBSTRING(?, 9), ?, ?, ?, ?, ?)`,
        [ 
            steamid.getSteam2RenderedID(), 
            options.lastJoinTime ?? null, options.lastIp ?? null, options.lastCountry ?? null, options.lastRegion ?? null, options.avatarHash ?? null 
        ]
    )
    return r.affectedRows > 0
}