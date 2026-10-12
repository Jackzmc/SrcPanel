import { PlayerEntry } from "@srcpanel/common/User";
import { RowDataPacket } from "mysql2";
import SteamID from "steamid";

export function formatPlayer(steamid: SteamID, row: RowDataPacket): PlayerEntry {
    const id = new SteamID()
    return {
        id: steamid.getSteam2RenderedID(),
        name: row.name,
        bansCount: parseInt(row.bansCount),
        notesCount: parseInt(row.notesCount),
        isAdmin: row.isAdmin == "1",
        country: row.country,
        region: row.region,
        firstJoinDate: parseInt(row.create_time),
        lastJoinDate: parseInt(row.lastJoinDate)
    }
}