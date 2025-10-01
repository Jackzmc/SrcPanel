import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { RowDataPacket } from "mysql2";
import pLimit from "p-limit";
import { SearchType, APISearchPartialResults, APISearchDetailResult } from '../../../../common-types/Search';
import { APIDiscussionFlags } from "../../../../common-types/Discussions.js";

/// The maximum number of search inner queries to resolve concurrently
const SEARCH_MAX_INNER_RESOLVE_CONCURRENT = 2

const SEARCH_QUERIES = [
    "SELECT 'activity_log' type, id, message content FROM activity_log WHERE message LIKE :query ORDER BY id DESC LIMIT 10",
    "SELECT 'user' type, u.account_id id, u.last_name content FROM view_panel_user u WHERE account_id LIKE :query OR last_name LIKE :query LIMIT 10",
    "SELECT 'note' type, notes.id, notes.content content FROM notes JOIN view_panel_user u ON u.account_id = notes.steamid WHERE notes.steamid LIKE :query OR notes.markedBy LIKE :query OR u.last_name LIKE :query OR notes.id LIKE :query OR notes.content LIKE :query  ORDER BY id DESC LIMIT 10",
    "SELECT 'ban' type, bans.id, bans.reason content FROM bans     JOIN view_panel_user u1 ON u1.account_id = bans.steamid     JOIN view_panel_user u2 ON u2.account_id = bans.executor       WHERE u1.last_name LIKE :query OR u2.last_name LIKE :query          OR bans.steamid LIKE :query OR bans.executor LIKE :query          OR bans.id LIKE :query OR bans.reason LIKE :query OR bans.public_message       LIKE :query       ORDER BY id DESC LIMIT 10",
    `SELECT 'discuss' type, id, title content FROM \`left4dead2-admins\`.dash_discussions WHERE ~flags & ${APIDiscussionFlags.Archived} AND (id LIKE :query OR title LIKE :query OR description LIKE :query) ORDER BY id DESC`,
    "SELECT 'event' type, id, name content FROM `left4dead2-admins`.dash_events WHERE id LIKE :query OR name LIKE :query OR description LIKE :query ORDER BY id DESC"
]
const SEARCH_QUERY = SEARCH_QUERIES
    .map(q => `(${q})`)
    .join(" UNION ")
// TODO: add servers

const SEARCH_DETAIL_QUERY_MAP: Record<SearchType, string> = {
    activity_log: "SELECT l.*, u1.last_name client_name, u2.last_name target_name FROM activity_log l LEFT JOIN view_panel_user u1 ON u1.account_id = SUBSTRING(l.client, 11) LEFT JOIN view_panel_user u2 ON u2.account_id = SUBSTRING(l.target, 11)  WHERE id = ? LIMIT 1",
    user: "SELECT * FROM view_panel_user WHERE account_id = ? LIMIT 1",
    note: "SELECT notes.*, u1.last_name client_name, u2.last_name markedBy_name FROM notes JOIN view_panel_user u1 ON u1.account_id = SUBSTRING(notes.steamid, 11) JOIN view_panel_user u2 ON u2.account_id = SUBSTRING(notes.steamid, 11) WHERE id = ? LIMIT 1",
    ban: "SELECT * FROM bans WHERE id = ? LIMIT 1",
    discuss: "SELECT * FROM `left4dead2-admins`.dash_discussions WHERE id = ? LIMIT 1",
    event: "SELECT * FROM `left4dead2-admins`.dash_events WHERE id = ? LIMIT 1"
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

        await Promise.all(detailQueries)

        return reply.status(204)
    })

    async function getFullResult<T>(result: SearchRawResult): Promise<T | null> {
        const query = SEARCH_DETAIL_QUERY_MAP[result.type]
        if(!query) throw new Error("Unknown inner query type " + result.type)

        const [rows] = await fastify.db.query<RowDataPacket[]>(query, [ result.id ])
        return rows.length > 0 ? rows[0] as T : null
    }
}