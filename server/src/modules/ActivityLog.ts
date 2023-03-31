import { Pool, OkPacket } from "mysql2/promise";
import User, { LogData } from "./users/User.js";
import { LogPropertiesType } from './users/User';

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
    private db: Pool

    constructor(db: Pool) {
        this.db = db
    }

    async addWebEntry(steamid: string, type: string, message?: string) {
        const [r] = await this.db.execute<OkPacket>(
            `INSERT INTO activity_log (server, type, client, target, message, timestamp) VALUES ('web', 'WEB', :client, NULL, :message, UNIX_TIMESTAMP())`,
            {
                client: steamid, 
                message: message ? ` ${type.toUpperCase()}: ${message}` : type.toUpperCase()
            }
        )

        return r.affectedRows > 0
    }

    //"Tank<146><BOT><>"
    //"soap suds<37><STEAM_1:1:223885525><>"
    async logWeb(activator: User, target?: User, message?: string, payload?: LogData) {
        let msg = null
        if(message) {
            msg = (message || "")
                .replace(/%client%/g, `"Activator<0><${activator.steamid64}><>"`)
            if(target) msg = msg.replace(/%target%/g, `"Target<0><${target.steamid64}><>"`)
        }

        let type = null
        if('type' in payload) type = payload.type
        else if('service' in payload) type = `${payload.service}.${payload.action}`


        const [r] = await this.db.execute<OkPacket>(
            `INSERT INTO activity_log (server, type, client, target, message, timestamp, metadata) VALUES ('web', :type, :client, :target, :msg, UNIX_TIMESTAMP(), :metadata)`,
            {
                client: activator.steamid64,
                target: target ? target.steamid64 : null,
                msg,
                type,
                metadata: payload.metadata ? JSON.stringify(payload.metadata) : null
            }
        )

        return r.affectedRows > 0
    }
}