import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { APIEvent, APIEventDetailed, APIWeekAvailability, EventDataSubmission } from '../../../../common-types/Event.js';
import { NOT_FOUND, NO_PERMISSION } from '../../responses.js';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async (req, reply) => {
        const domain = await fastify.config.GetKV("domain");
        const [rows] = await fastify.db.query<RowDataPacket[]>("SELECT e.*, u.name as creator_name FROM `left4dead2-admins`.dash_events e LEFT JOIN `left4dead2`.user_names u ON SUBSTRING(e.creator_id, 11) = u.steamid ORDER BY created_date", [])
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
                } as APIEvent
            })
        }
    })
    fastify.get('/:id', async(req: FastifyRequest<{Params: {id: string}}>, reply): Promise<APIEventDetailed<string>> => {
        const [rows] = await fastify.db.query<RowDataPacket[]>("SELECT e.*, u.name as creator_name FROM `left4dead2-admins`.dash_events e LEFT JOIN `left4dead2`.user_names u ON SUBSTRING(e.creator_id, 11) = u.steamid WHERE id = ? ORDER BY created_date", [req.params.id])
        if(rows.length > 0) {
            const row = rows[0]
            const domain = await fastify.config.GetKV("domain");
            const [rawWeeks] = await fastify.db.query<RowDataPacket[]>("SELECT r.steamid, u.name as name, week_start, week_end, TO_BASE64(days) as base64 FROM `left4dead2-admins`.dash_event_responses r LEFT JOIN `left4dead2`.user_names u ON SUBSTRING(r.steamid, 11) = u.steamid WHERE event_id = ?", [req.params.id])  
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
                weeks: Object.values(weeks).sort((a,b) => a.startDate - b.startDate)
            }
        } else {
            return NOT_FOUND(reply, "No event with that id could be found")
        }
    })
    fastify.post('/:id/my-schedule', async(req: FastifyRequest<{Params: {id: string}, Body: EventDataSubmission<string> }>, reply) => {
        if(!req.body.weeks) {
            return reply.code(400).send({
                error: "NO_WEEKS_PROVIDED",
                message: "No weeks were provided"
            })
        }
        const conn = await fastify.db.getConnection()
        await conn.beginTransaction()
        for(const week of req.body.weeks) {
            await conn.execute("INSERT INTO `left4dead2-admins`.dash_event_responses (event_id, steamid, start_date, data) VALUES (?, ?, ?, FROM_BASE64(?))", [req.params.id, req.user.steamid2, week.startDate, week.data])    
        }
        await conn.commit()
        return {

        }
    })
}

// Converts every 8 booleans into one byte where each bit is its value
function toBytes(array: boolean[]): Uint8Array {
    let bytes = [];
    for(let i = 0; i < array.length; i += 8) {
      let value = 0
      for(let bit = 0; bit < 8; bit++) {
        if(array[i+bit]) {
          value |= (1 << bit);
        }
      }
      bytes.push(value)
    }
    return new Uint8Array(bytes)
}
function fromBytes(bytes: Uint8Array): boolean[][] {
    let array = []
    for(let i = 0; i < bytes.length; i++) {
        for(let bit = 0; bit < 8; bit++) {
            let bitValue = 1 << bit;
            array.push((bytes[i] & bitValue) == bitValue)
        }
    }
    return array
}
function serializeWeekData(array: boolean[]): string {
    return btoa(String.fromCharCode.apply(null, toBytes(array)))
}
function deserializeWeekData(base64: string): boolean[][] {
    return fromBytes(new Uint8Array(atob(base64).split("").map(function(c) {
        return c.charCodeAt(0); })));
}