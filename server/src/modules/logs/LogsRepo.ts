import type { LogEntry, LogType } from "@srcpanel/common/Logs"
import { MAIN_DB, TABLE_PREFIX, type DBClient } from "../../core/database.js"
import { QueryBuilder, SortDirection } from "../QueryBuilder.js"
import { formatLogEntry } from "./index.js"
import { ACTIVITY_LOG_TABLE_NAME } from "./LogsManager.js"
import type { ResultSetHeader, RowDataPacket } from "mysql2"

export interface FetchLogOptions {
    limit?: number,
    sort?: SortDirection,
    year?: number,
    searchClient?: string,
    searchTarget?: string,
    searchMessage?: string,
    types?: string[],
    servers?: string[]
}

/**
 * Fetches logs in 'before' an id (inclusive), 'after' an id (exclusive), or around an id (id's entry in the center). 
 * @param db connection or pool
 * @param type either 'before', 'after', or 'around'
 * @param id the id to use for direction
 * @param options other options such as limit and filters
 * @returns [ an array of log entries, total filtered rows ]
 */
export async function fetchLogs(db: DBClient, type: "before" | "after" | "around", id: number, options: FetchLogOptions = {}): Promise<[ LogEntry[], number ]> {
    const limit = options.limit ?? 30

    const query = QueryBuilder.startSelect(ACTIVITY_LOG_TABLE_NAME, "l")
        .selectMultiple("id", "l.timestamp", "server", "type", "client", "target", "message", "metadata")
        .select("s1.last_name", "clientName")
        .select("s2.last_name", "targetName")
        .leftJoin(`view_${TABLE_PREFIX}_user`, "account_id", "=", "SUBSTRING(client, 11)", "s1", true)
        .leftJoin(`view_${TABLE_PREFIX}_user`, "account_id", "=", "SUBSTRING(target, 11)", "s2", true)
        .limit(limit)
        .sort('id', SortDirection.Descending)

    if(options.year) {
        query
            .where("timestamp", ">=", Math.floor(new Date(`${options.year}-01-01T00:00:00`).getTime() / 1000))
            .where("timestamp", "<", Math.floor(new Date(`${options.year + 1}-01-01T00:00:00`).getTime() / 1000))
    }

    // FIXME: A mariadb bug (https://jira.mariadb.org/browse/MDEV-40479) causes DESC to give wrong
    // number of rows with partitioned tables. Fixed in 12.3.4, but we stuck on 12.3.3
    // As a hack, we use id+0 with a raw WHERE to fix it
    if (type === 'before') query.whereRaw("id+0", '<=', id)
    else if (type === 'after') query.whereRaw("id+0", '>', id)
    else if (type === 'around') {
        const half = Math.ceil(limit / 2)
        query
            .whereRaw("id+0", '>', id - half)
            .whereRaw("id+0", '<=', id + half)
    }

    if (options.searchClient) query.where('client', '=', options.searchClient)
    if (options.searchTarget) query.where('target', '=', options.searchTarget)
    if (options.searchMessage) query.where('message', 'LIKE', `%${options.searchMessage}%`)
    if (options.servers) query.whereIn('server', options.servers)
    if (options.types) query.whereIn('type', options.types)

    const [ [ rawLogs ], totalFilteredRows ] = await Promise.all([ query.execute(db), query.executeCount(db) ])
    const logs = rawLogs.map(formatLogEntry)
    return [ logs, totalFilteredRows ]
}

/**
 * Adds a new entry to the activity log
 * @param db connection or pool
 * @param type log type (ACTION, CHAT, JOIN, QUIT, STATE, web)
 * @param server the server this was performed on
 * @param clientId optional id of client
 * @param targetId optional id of target
 * @param msg optional message
 * @param metadata any key value metadata
 * @param timestamp optional unix timestamp in seconds, otherwise now
 * @returns 
 */
export async function addLogEntry(db: DBClient, type: LogType, server: string, clientId?: string | null, targetId?: string | null, msg?: string | null, metadata?: Record<string, string|number>, timestamp?: number): Promise<number> {
    const [r] = await db.execute<ResultSetHeader>(
        `INSERT INTO activity_log (server, type, client, target, message, timestamp, metadata) 
        VALUES (:server, :type, :client, :target, :msg, :timestamp, :metadata)`,
        {
            client: clientId ?? null,
            target: targetId ?? null,
            msg: msg ?? null,
            type,
            server,
            metadata: metadata ? JSON.stringify(metadata) : null,
            timestamp: timestamp ?? Math.floor(Date.now()/1000)
        }
    )
    return r.insertId
}

export async function getPartitionNames(db: DBClient): Promise<{PARTITION_NAME: string}[]> {
    const [partitions] = await db.execute<RowDataPacket[]>(`
        SELECT PARTITION_NAME FROM information_schema.partitions
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = ?
            AND PARTITION_NAME IS NOT NULL
            ORDER BY PARTITION_DESCRIPTION
            LIMIT 1`,
        [ MAIN_DB, ACTIVITY_LOG_TABLE_NAME ]
    )
    return partitions as { PARTITION_NAME: string }[]
}

export async function addPartition(db: DBClient, year: number, nextYear: number): Promise<void> {
    await db.execute(`
        ALTER TABLE activity_log ADD PARTITION IF NOT EXISTS
        ( PARTITION p${year} VALUES LESS THAN ( UNIX_TIMESTAMP('${nextYear}-01-01 00:00') ) )`
    )
}

/**
 * Redacts a specific log entry by setting its message to ['redacted']
 * @param id 
 */
export async function redactId(db: DBClient, id: number) {
    await db.execute(`
        UPDATE ${ACTIVITY_LOG_TABLE_NAME} 
        SET message = '[redacted]' 
        WHERE id = ?`, 
        [ id ]
    )
}

export async function getLogEntry(db: DBClient, id: number): Promise<LogEntry | null> {
    const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT 
            id, l.timestamp, server, type, client, target, message, metadata, 
            s1.last_name clientName, 
            s2.last_name targetName
        FROM ${ACTIVITY_LOG_TABLE_NAME} 
        LEFT JOIN view_${TABLE_PREFIX}_user s1 ON s1.account_id = SUBSTRING(client, 11)
        LEFT JOIN view_${TABLE_PREFIX}_user s2 ON s2.account_id = SUBSTRING(target, 11)
        WHERE id = ?
        LIMIT 1`, 
        [ id ]
    )
    return rows.length > 0 ? formatLogEntry(rows[0]) : null
}

export interface PartitionData {
  minId: number,
  maxId: number,
  count: number,
  year: number
}
export async function getPartitionData(db: DBClient): Promise<PartitionData[]> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT
            MIN(id) as lowestId, 
            MAX(id) as highestId, 
            COUNT(*) as count, 
            YEAR(from_unixtime(timestamp)) year
        FROM activity_log
        GROUP BY year
        ORDER BY year`
    )
    return rows.map(row => {
        return {
            minId: Number(row.lowestId),
            maxId: Number(row.highestId),
            count: Number(row.count),
            year: Number(row.year),
        }
    })
}

export async function getDistinctServers(db: DBClient): Promise<string[]> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT DISTINCT server FROM activity_log
        WHERE server IS NOT NULL
        ORDER BY timestamp DESC
    `)
    return rows.map(row => row.server)
}