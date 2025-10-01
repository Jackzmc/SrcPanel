import { Pool, OkPacket } from "mysql2/promise";
import User, { LogData } from "./users/User.js";

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
    async logWeb(activator: User, target?: User|null, message?: string, payload?: LogData): Promise<number> {
        let msg: string|null = null
        if(message) {
            msg = (message || "")
                .replace(/%client%/g, `"${await activator.name() ?? "Activator"}<0><${activator.steamid2}><>"`)
            if(target) msg = msg.replace(/%target%/g, `"${await target.name() ?? "Target"}<0><${target.steamid2}><>"`)
        }
        
        // Legacy
        let permission:string|null = null
        if(payload) {
            if('code' in payload) permission = payload.code
            else if('type' in payload) permission = payload.type
        }

        let metadata = payload?.metadata

        if(!metadata) metadata = {}
        metadata.permission = permission

        const [r] = await this.#db.execute<OkPacket>(
            `INSERT INTO activity_log (server, type, client, target, message, timestamp, metadata) VALUES ('web', :type, :client, :target, :msg, UNIX_TIMESTAMP(), :metadata)`,
            {
                client: activator.steamid2,
                target: target ? target.steamid2 : null,
                msg,
                type: "web",
                metadata: JSON.stringify(metadata)
            }
        )

        return r.insertId
    }
}