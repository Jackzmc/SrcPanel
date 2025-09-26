import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { RowDataPacket } from "mysql2";
import pLimit from "p-limit";

/// The LIMIT to add to each inner query
const SEARCH_INNER_QUERY_LIMIT = 5
/// The maximum number of search inner queries to resolve concurrently
const SEARCH_MAX_INNER_RESOLVE_CONCURRENT = 2

const SEARCH_QUERIES = [
    "SELECT 'activity_log' type, id, message content FROM activity_log WHERE message LIKE :query ORDER BY id DESC",
    "SELECT 'user' type, u.account_id id, u.last_name content FROM view_panel_user u WHERE account_id LIKE :query OR last_name LIKE :query",
    "SELECT 'note' type, notes.id, notes.content content FROM notes JOIN view_panel_user u ON u.account_id = notes.steamid WHERE notes.steamid LIKE :query OR notes.markedBy LIKE :query OR u.last_name LIKE :query OR notes.id LIKE :query OR notes.content LIKE :query  ORDER BY id DESC",
    "SELECT 'ban' type, bans.id, bans.reason content FROM bans     JOIN view_panel_user u1 ON u1.account_id = bans.steamid     JOIN view_panel_user u2 ON u2.account_id = bans.executor       WHERE u1.last_name LIKE :query OR u2.last_name LIKE :query          OR bans.steamid LIKE :query OR bans.executor LIKE :query          OR bans.id LIKE :query OR bans.reason LIKE :query OR bans.public_message       LIKE :query       ORDER BY id DESC",
    "SELECT 'discuss' type, id, title content FROM `left4dead2-admins`.dash_discussions WHERE id LIKE :query OR title LIKE :query OR description LIKE :query ORDER BY id DESC",
    "SELECT 'event' type, id, name content FROM `left4dead2-admins`.dash_events WHERE id LIKE :query OR name LIKE :query OR description LIKE :query ORDER BY id DESC"
]

const SEARCH_DETAIL_QUERY_MAP: Record<string, string> = {
    activity_log: "SELECT * FROM activity_log WHERE id = ? LIMIT 1",
    user: "SELECT * FROM view_panel_user WHERE account_id = ? LIMIT 1",
    note: "SELECT * FROM notes WHERE id = ? LIMIT 1",
    ban: "SELECT * FROM bans WHERE id = ? LIMIT 1",
    discuss: "SELECT * FROM `left4dead2-admins`.dash_discussions WHERE id = ? LIMIT 1",
    event: "SELECT * FROM `left4dead2-admins`.dash_events WHERE id = ? LIMIT 1"
}

const SEARCH_QUERY = SEARCH_QUERIES
    .map(q => `(${q} LIMIT ${SEARCH_INNER_QUERY_LIMIT})`)
    .join(" UNION ")

interface SearchResult extends RowDataPacket {
    type: string,
    id: string,
    content: string
}

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async(req: FastifyRequest<{Querystring: { q: string }}>, reply) => {
        const time = performance.now()

        reply.raw.writeHead(200, {
            'Cache-Control': 'no-cache,no-transform',
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        reply.raw.flushHeaders()
        reply.raw.write('retry: 10000\n\n')

        function sendSSE(payload: any) {
            return reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`)
        }

        const query = `%${req.query.q}%`
        const [rows] = await fastify.db.query<SearchResult[]>(SEARCH_QUERY, { query })

        const mainQueryTime = performance.now()

        sendSSE({ type: "result_partial", results: rows, timeTaken: mainQueryTime - time })

        const limit = pLimit(SEARCH_MAX_INNER_RESOLVE_CONCURRENT)

        const detailQueries = rows.map(async result => {
            return limit(async () => {
                const data = await getFullResult(result)
                sendSSE({ type: "result", id: result.id, data: data, timeTaken: performance.now() - mainQueryTime })
            })
        })

        await Promise.allSettled(detailQueries)

        reply.hijack()
        reply.raw.end()
    })

    async function getFullResult<T>(result: SearchResult): Promise<T | null> {
        const query = SEARCH_DETAIL_QUERY_MAP[result.type]
        if(!query) throw new Error("Unknown inner query type " + result.type)

        const [rows] = await fastify.db.query<RowDataPacket[]>(query, [ result.id ])
        return rows.length > 0 ? rows[0] as T : null
    }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));