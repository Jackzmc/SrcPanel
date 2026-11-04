import { TABLE_PREFIX, type DBClient } from "../../core/database.js"
import { QueryBuilder, SortDirection } from "../QueryBuilder.js"
import { formatLogEntry } from "./index.js"
import { ACTIVITY_LOG_TABLE_NAME } from "./LogsManager.js"

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

export async function fetchLogs(db: DBClient, type: "before" | "after" | "around", id: number, options: FetchLogOptions = {}) {
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

    if (type === 'before') query.where("id", '<=', id)
    else if (type === 'after') query.where("id", '>', id)
    else if (type === 'around') {
    const half = Math.ceil(limit / 2)
    query.where("id", '>', id - half)
        .where("id", '<=', id + half)
    }

    if (options.searchClient) query.where('client', '=', options.searchClient)
    if (options.searchTarget) query.where('target', '=', options.searchTarget)
    if (options.searchMessage) query.where('message', 'LIKE', `%${options.searchMessage}%`)
    if (options.servers) query.whereIn('server', options.servers)
    if (options.types) query.whereIn('type', options.types)

    const [rawLogs] = await query.execute(db)
    const logs = rawLogs.map(formatLogEntry)
    return logs
}