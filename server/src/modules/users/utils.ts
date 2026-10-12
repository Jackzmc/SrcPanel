import { PlayerEntry } from "@srcpanel/common/User";
import { RowDataPacket } from "mysql2";
import SteamID from "steamid";

/**
 * Formats players fetched from db. 
 * @param steamid 
 * @param row Raw columns (not renamed)
 * @returns 
 */
export function formatPlayer(steamid: SteamID, row: RowDataPacket): PlayerEntry {
    return {
        id: steamid.getSteam2RenderedID(),
        name: row.name,
        bansCount: parseInt(row.bans_count),
        notesCount: parseInt(row.notes_count),
        isAdmin: row.is_admin == "1",
        country: row.country,
        region: row.region,
        firstJoinDate: parseInt(row.create_time),
        lastJoinDate: parseInt(row.last_join_time)
    }
}