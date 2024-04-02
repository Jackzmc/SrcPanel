import { Pool, OkPacket } from "mysql2/promise";
import User, { LogData } from "./users/User.js";

interface LogEntry {
    id: number,
    timestamp: number,
    server: string,
    type: string,
    client: string,
    target: string,
    message: string
}

interface WebLogEntry extends LogEntry {
    type: "ACT",
    server: "web"
}

/*
id        bigint auto_increment
        primary key,
    timestamp bigint                        not null,
    server    varchar(64) default 'unknown' null,
    type      varchar(32)                   not null,
    client    varchar(32)                   null,
    target    varchar(32)                   null,
    message   varchar(256)  
    */

export default class ActivityLog {
    #db: Pool

    constructor(db: Pool) {
        this.#db = db
    }

    //"Tank<146><BOT><>"
    //"soap suds<37><STEAM_1:1:223885525><>"
    async logWeb(activator: User, target?: User, message?: string, payload?: LogData): Promise<number> {
        let msg = null
        if(message) {
            msg = (message || "")
                .replace(/%client%/g, `"${await activator.name() ?? "Activator"}<0><${activator.steamid2}><>"`)
            if(target) msg = msg.replace(/%target%/g, `"${await target.name() ?? "Target"}<0><${target.steamid2}><>"`)
        }
        
        // Legacy
        let type = null
        if('code' in payload) type = payload.code
        else if('type' in payload) type = payload.type

        const [r] = await this.#db.execute<OkPacket>(
            `INSERT INTO activity_log (server, type, client, target, message, timestamp, metadata) VALUES ('web', :type, :client, :target, :msg, UNIX_TIMESTAMP(), :metadata)`,
            {
                client: activator.steamid2,
                target: target ? target.steamid2 : null,
                msg,
                type,
                metadata: payload.metadata ? JSON.stringify(payload.metadata) : null
            }
        )

        return r.insertId
    }
}