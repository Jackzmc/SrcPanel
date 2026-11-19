import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { RowDataPacket } from "mysql2";
import pLimit from "p-limit";
import { SearchType, APISearchPartialResults, APISearchDetailResult } from '@srcpanel/common/Search';
import { APIDiscussionFlags } from "@srcpanel/common/Discussions";
import { ADMINS_DB, TABLE_PREFIX } from "../../core/database.js";

/// The maximum number of search inner queries to resolve concurrently
const SEARCH_MAX_INNER_RESOLVE_CONCURRENT = 2

const SEARCH_QUERIES = [
    // activity logs
    `SELECT 'activity_log' type, id, message content 
        FROM activity_log 
    WHERE message LIKE :query 
    ORDER BY id DESC 
    LIMIT 10`,
    // users
    `SELECT 'user' type, u.steamid_slice id, u.last_name content 
        FROM view_${TABLE_PREFIX}_user u 
        WHERE steamid_slice LIKE :query 
            OR last_name LIKE :query 
        LIMIT 10`,
    // notes
    `SELECT 'note' type, notes.id, notes.content content 
    FROM notes JOIN view_${TABLE_PREFIX}_user u 
        ON u.steamid_slice = SUBSTRING(notes.steamid,9) 
    WHERE notes.steamid LIKE :query 
        OR notes.markedBy LIKE :query 
        OR u.last_name LIKE :query 
        OR notes.id LIKE :query 
        OR notes.content LIKE :query  
    ORDER BY id DESC 
    LIMIT 10`,
    // bans
    `SELECT 'ban' type, bans.id, bans.reason content 
        FROM bans     
    JOIN view_${TABLE_PREFIX}_user u1 
        ON u1.steamid_slice = SUBSTRING(bans.steamid,9) 
    JOIN view_${TABLE_PREFIX}_user u2 
        ON u2.steamid_slice = SUBSTRING(bans.executor,9)       
    WHERE u1.last_name LIKE :query 
        OR u2.last_name LIKE :query          
        OR bans.steamid LIKE :query 
        OR bans.executor LIKE :query          
        OR bans.id LIKE :query 
        OR bans.reason LIKE :query 
        OR bans.public_message LIKE :query       
    ORDER BY id DESC 
    LIMIT 10`,
    // discussions
    `SELECT 'discuss' type, id, title content 
        FROM ${TABLE_PREFIX}_discussions 
    WHERE ~flags & ${APIDiscussionFlags.Archived} 
        AND (
            id LIKE :query 
            OR title LIKE :query 
            OR description LIKE :query
        ) 
    ORDER BY id DESC`,
    // events
    `SELECT 'event' type, id, name content 
    FROM ${TABLE_PREFIX}_events 
    WHERE id LIKE :query 
        OR name LIKE :query 
        OR description LIKE :query 
    ORDER BY id DESC`
]
const SEARCH_QUERY = SEARCH_QUERIES
    .map(q => `(${q})`)
    .join(" UNION ")

const SEARCH_DETAIL_QUERY_MAP: Record<SearchType, string> = {
    activity_log: `SELECT l.*, u1.last_name client_name, u2.last_name target_name 
        FROM activity_log l 
        LEFT JOIN view_${TABLE_PREFIX}_user u1 
            ON u1.steamid_slice = SUBSTRING(l.client, 9) 
        LEFT JOIN view_${TABLE_PREFIX}_user u2 
            ON u2.steamid_slice = SUBSTRING(l.target, 9)  
        WHERE id = ? 
        LIMIT 1`,
    user: `SELECT * 
        FROM view_${TABLE_PREFIX}_user 
        WHERE steamid_slice = SUBSTRING(?,9)
        LIMIT 1`,
    note: `SELECT notes.*, u1.last_name client_name, u2.last_name markedBy_name 
        FROM notes JOIN view_${TABLE_PREFIX}_user u1 
            ON u1.steamid_slice = SUBSTRING(notes.steamid, 9)) 
        JOIN view_${TABLE_PREFIX}_user u2 
            ON u2.steamid_slice = SUBSTRING(notes.steamid, 9)) 
        WHERE id = ? 
        LIMIT 1`,
    ban: `SELECT * FROM bans 
        WHERE id = ? 
        LIMIT 1`,
    discuss: `SELECT * 
        FROM ${TABLE_PREFIX}_discussions 
        WHERE id = ? 
        LIMIT 1`,
    event: `SELECT * 
        FROM ${TABLE_PREFIX}_events 
        WHERE id = ? 
        LIMIT 1`
}

interface SearchRawResult extends RowDataPacket {
    type: string,
    id: string,
    content: string
}

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', { config: { rateLimit: { max: 3, timeWindow: 1000 } } }, async(req: FastifyRequest<{Querystring: { q: string }}>, reply) => {
        const time = performance.now()

        reply.raw.writeHead(200, {
            'Cache-Control': 'no-cache,no-transform',
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        reply.raw.flushHeaders()
        reply.hijack()
        const abort = new AbortController()
        req.raw.on("close", () => {
            abort.abort("socket closed")
        })


        function sendSSE(payload: any) {
            return reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`)
        }

        const query = `%${req.query.q}%`
        const [rows] = await fastify.db.query<SearchRawResult[]>(SEARCH_QUERY, { query })

        const mainQueryTime = performance.now()

        sendSSE({ results: rows, timeTaken: mainQueryTime - time } as APISearchPartialResults )

        const limit = pLimit(SEARCH_MAX_INNER_RESOLVE_CONCURRENT)

        const detailQueries = rows.map(async result => {
            abort.signal.throwIfAborted()
            return limit(async () => {
                abort.signal.throwIfAborted()
                try {
                    const data = await getFullResult(result)
                    sendSSE({ type: result.type, id: result.id, data: data, timeTaken: performance.now() - mainQueryTime } as APISearchDetailResult<object>)
                } catch(error) {
                    fastify.log.error({ error }, "search getFullResult error")
                    return { error }
                }
            })
        })

        await Promise.allSettled(detailQueries)

        sendSSE({ done: true })

        return reply.status(204)
    })

    async function getFullResult<T>(result: SearchRawResult): Promise<T | null> {
        const query = SEARCH_DETAIL_QUERY_MAP[result.type]
        if(!query) throw new Error("Unknown inner query type " + result.type)

        const [rows] = await fastify.db.query<RowDataPacket[]>(query, [ result.id ])
        return rows.length > 0 ? rows[0] as T : null
    }
}