import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';

const TROLL_NAME_REGEX = new RegExp(/activated (troll )?"([a-zA-Z 0-9]+)"/)

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get("/trolls", async (req, reply) => {
        const [rows] = await fastify.db.execute<RowDataPacket[]>(`
            SELECT message FROM activity_log
            WHERE type = 'ACTION' AND message LIKE '%activated%'
            ORDER BY id DESC`)

        const trolls: Record<string, number> = {}

        for(const row of rows) {
            const match = row.message.match(TROLL_NAME_REGEX)
            if(!match || match.length < 3) continue
            const [,,trollName] = match
            
            if(!trolls[trollName]) trolls[trollName] = 0
            trolls[trollName]++
        }
        
        return trolls
    })

    fastify.get("/bans", async (req, reply) => {
        const [rows] = await fastify.db.execute<RowDataPacket[]>(`
            SELECT date_start, date_end, date_end - date_start as duration
            FROM stats_games
            WHERE date_start > 0 AND FROM_UNIXTIME(date_end) > DATE_SUB(NOW(), INTERVAL 1 YEAR) 
            ORDER BY id DESC`)

        return rows.map(row => {
            return {
                x: row.date_start,
                y: Math.round(row.duration / 60)
            }
        })
    })
}