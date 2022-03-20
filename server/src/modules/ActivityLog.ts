import { Pool, OkPacket } from "mysql2/promise";

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

    async addWebEntry(adminId: string, type: string, message?: string) {
        const [r] = await this.db.execute<OkPacket>(
            `INSERT INTO activity_log (server, type, client, target, message) VALUES ('web', 'WEB', ?, NULL, '')`,
            [adminId, message ? `${type.toUpperCase()}: ${message}` : type.toUpperCase()]
        )

        return r.affectedRows > 0
    }
}