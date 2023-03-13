import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';



export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    fastify.get('/:id', async (req: FastifyRequest<{Params:{id: 'string' }}>, reply) => {
        const [appeals] = await fastify.db.execute<RowDataPacket[]>(
            "SELECT ba.ban_id, ba.state, ba.message, bans.steamid, ba.reject_reason, ba.created, IFNULL(names.name, su.last_alias) as name FROM ban_appeals ba LEFT JOIN bans ON bans.id = ba.ban_id LEFT JOIN user_names as names on SUBSTRING(bans.steamid, 11) = names.steamid LEFT JOIN stats_users su ON SUBSTRING(su.steamid, 11) = SUBSTRING(bans.steamid, 11) WHERE ba.ban_id = ? OR ba.id = ?",
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