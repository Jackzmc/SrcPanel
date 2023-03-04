import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid'
import { APIBanFlags, BanAppealState } from '../../../../common-types/Ban.js';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.post('/:appealid/approve', async(req: FastifyRequest<{Params: { appealid: string }}>, reply) => {
        // Suspend the ban by grabbing the id from appeal
        await fastify.db.execute(
            `UPDATE bans SET flags = ~flags & ${APIBanFlags.Suspended} WHERE id = (SELECT ban_id FROM ban_appeals WHERE id = ?)`,
            [req.params.appealid]
        )

        await fastify.db.execute(
            "UPDATE ban_appeals SET state = ?",
            [ BanAppealState.Accepted ]
        )

        await fastify.authmngr.log.addWebEntry(req.session.user.steamid, "APPEAL_ACCEPT", `approved appeal ${req.params.appealid}`)

        return reply.status(204).send()
    })

    fastify.post('/:appealid/reject', async(req: FastifyRequest<{Params: { appealid: string }, Querystring: { reason: string }}>, reply) => {
        if(!req.query.reason) {
            return reply.status(400).send({
                error: "INVALID_REJECT",
                message: "Missing the reason for the appeal rejection"
            })
        }
        await fastify.db.execute(
            "UPDATE ban_appeals SET state = ?, reject_reason = ?, rejecter_id = ? WHERE id = ?",
            [ BanAppealState.Rejected, req.query.reason, req.session.user.steamid, req.params.appealid]
        )
        console.log( [ BanAppealState.Rejected, req.query.reason, req.session.user.steamid, req.params.appealid])

        await fastify.authmngr.log.addWebEntry(req.session.user.steamid, "APPEAL_REJECT", `rejected appeal ${req.params.appealid} for: \"${req.query.reason}\"`)

        return reply.status(204).send()
    })
}