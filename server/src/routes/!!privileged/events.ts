import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { APIEvent, APIEventDetailed, APIWeekAvailability, EventDataSubmission } from '@jzpanel/common/Event';
import { NOT_FOUND } from '../../responses.js';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async (req, reply) => {
        const domain = await fastify.config.Domain
        const [rows] = await fastify.db.query<RowDataPacket[]>("SELECT e.*, u.last_name as creator_name FROM `left4dead2-admins`.dash_events e LEFT JOIN `left4dead2`.view_panel_user u ON SUBSTRING(e.creator_id, 11) = u.account_id ORDER BY created_date desc", [])
        return {
            events: rows.map(row => {
                return {
                    id: row.id,
                    creator: {
                        id: row.creator_id,
                        name: row.creator_name,
                        avatarUrl: `${domain}/api/users/${row.creator_id}/avatar`
                    },
                    name: row.name,
                    description: row.description,
                    range: [row.start_date, row.end_date],
                    hourRange: [row.min_hour, row.max_hour],
                } as APIEvent
            })
        }
    })
    fastify.get('/:id', async(req: FastifyRequest<{Params: {id: string}}>, reply): Promise<APIEventDetailed<string>> => {
        const [rows] = await fastify.db.query<RowDataPacket[]>("SELECT e.*, u.last_name as creator_name FROM `left4dead2-admins`.dash_events e LEFT JOIN `left4dead2`.view_panel_user u ON SUBSTRING(e.creator_id, 11) = u.account_id WHERE id = ?", [req.params.id])
        if(rows.length > 0) {
            const row = rows[0]
            const domain = await fastify.config.Domain
            const [rawWeeks] = await fastify.db.query<RowDataPacket[]>("SELECT r.steamid, u.last_name as name, week_start, week_end, TO_BASE64(days) as base64 FROM `left4dead2-admins`.dash_event_responses r LEFT JOIN `left4dead2`.view_panel_user u ON SUBSTRING(r.steamid, 11) = u.account_id WHERE event_id = ?", [req.params.id])  
            const weeks: Record<string, APIWeekAvailability<string>> = {}
            for(const row of rawWeeks) {
                if(!weeks[row.week_start]) weeks[row.week_start] = {
                    startDate: row.week_start,
                    endDate: row.week_end,
                    availability: []
                }
                weeks[row.week_start].availability.push({
                    user: {
                        id: row.steamid,
                        name: row.name,
                        avatarUrl: `${domain}/api/users/${row.steamid}/avatar`
                    },
                    data: row.base64
                })
            }
            return {
                id: row.id,
                creator: {
                    id: row.creator_id,
                    name: row.creator_name,
                    avatarUrl: `${domain}/api/users/${row.creator_id}/avatar`
                },
                name: row.name,
                description: row.description,
                range: [row.min_date, row.max_date],
                hourRange: [row.min_hour, row.max_hour],
                weeks: Object.values(weeks).sort((a,b) => a.startDate - b.startDate),
            }
        } else {
            return NOT_FOUND(reply, "Event")
        }
    })
    fastify.post('/:id/my-schedule', async(req: FastifyRequest<{Params: {id: number}, Body: EventDataSubmission<string> }>, reply) => {
        if(!req.body.weeks) {
            return reply.code(400).send({
                error: "NO_WEEKS_PROVIDED",
                message: "No weeks were provided"
            })
        }
        const conn = await fastify.db.getConnection()
        await conn.beginTransaction()
        for(const week of req.body.weeks) {
            await conn.execute("INSERT INTO `left4dead2-admins`.dash_event_responses (event_id, steamid, week_start, days) VALUES (?, ?, ?, FROM_BASE64(?)) ON DUPLICATE KEY UPDATE days = FROM_BASE64(?)", [req.params.id, req.user!.steamid2, week.startDate, week.data, week.data])    
        }
        await conn.commit()
        conn.release()
        return reply.status(204).send()
    })
}