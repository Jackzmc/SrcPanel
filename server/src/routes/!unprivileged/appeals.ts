import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { TABLE_PREFIX } from '../../middlewares/managers.js';



export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    fastify.get('/:id', async (req: FastifyRequest<{Params:{id: 'string' }}>, reply) => {
        const [appeals] = await fastify.db.execute<RowDataPacket[]>(`
            SELECT 
                ba.ban_id, ba.state, ba.message, bans.steamid, ba.reject_reason, ba.created, 
                u.last_name as name 
            FROM ban_appeals ba
            LEFT JOIN bans ON bans.id = ba.ban_id 
            LEFT JOIN user_names as names on SUBSTRING(bans.steamid, 11) = names.steamid 
            LEFT JOIN view_${TABLE_PREFIX}_users u ON SUBSTRING(bans.steamid, 11) = u.account_id
            WHERE 
                ba.ban_id = ? OR 
                ba.id = ?`,
            [ req.params.id, req.params.id ]
        )
        if(appeals.length === 0) {
            return reply.status(404).send({
                error: "NOT_FOUND",
                message: "No appeals found with the given id or for that ban id"
            })
        }

        return {
            appeals
        }
    })
}