import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";

/// The LIMIT to add to each inner query
const SEARCH_INNER_QUERY_LIMIT = 5

const QUERIES = [
    "SELECT 'activity_log', id, message content FROM activity_log WHERE message LIKE :query ORDER BY id DESC",
    "SELECT 'user', u.account_id id, u.last_name content FROM view_panel_user u WHERE account_id LIKE :query OR last_name LIKE :query",
    "SELECT 'note', notes.id, notes.content content FROM notes JOIN view_panel_user u ON u.account_id = notes.steamid WHERE notes.steamid LIKE :query OR notes.markedBy LIKE :query OR u.last_name LIKE :query OR notes.id LIKE :query OR notes.content LIKE :query  ORDER BY id DESC",
    "SELECT 'ban', bans.id, bans.reason content FROM bans     JOIN view_panel_user u1 ON u1.account_id = bans.steamid     JOIN view_panel_user u2 ON u2.account_id = bans.executor       WHERE u1.last_name LIKE :query OR u2.last_name LIKE :query          OR bans.steamid LIKE :query OR bans.executor LIKE :query          OR bans.id LIKE :query OR bans.reason LIKE :query OR bans.public_message       LIKE :query       ORDER BY id DESC",
    "SELECT 'discuss', id, title content FROM `left4dead2-admins`.dash_discussions WHERE id LIKE :query OR title LIKE :query OR description LIKE :query ORDER BY id DESC",
    "SELECT 'event', id, name content FROM `left4dead2-admins`.dash_events WHERE id LIKE :query OR name LIKE :query OR description LIKE :query ORDER BY id DESC"
]

const SEARCH_QUERY = QUERIES
    .map(q => `(${q} LIMIT ${SEARCH_INNER_QUERY_LIMIT})`)
    .join(" UNION ")

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async(req: FastifyRequest<{Querystring: { q: string }}>, reply) => {
        const time = performance.now()

        const query = `%${req.query.q}%`
        const [rows] = await fastify.db.query(SEARCH_QUERY, { query })

        return {
            results: rows,
            meta: {
                timeTaken: performance.now() - time
            }
        }
    })
}