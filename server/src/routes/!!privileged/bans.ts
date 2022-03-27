import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid'

const STEAM_WEB_APIKEY = process.env.STEAM_WEB_APIKEY

const PUTBanBody = Type.Object({
    steamid: Type.Optional(Type.String()),
    executor: Type.Optional(Type.String()),
    reason: Type.Optional(Type.String()),
    flags: Type.Optional(Type.Integer()),
    expires: Type.Optional(Type.String()),
    public_message: Type.Optional(Type.String()),
})
type PUTBanBodyType = Static<typeof PUTBanBody>;

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.route({
        url: '/:id', 
        method: 'PUT',
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        changes: { type: 'number' },
                    }
                }
            },
            params: {
                id: {
                    type: "number"
                }
            }
        },
        async handler(req: FastifyRequest<{ Body: PUTBanBodyType, Params: { id: number } }>, reply) {
            const [existing] = await fastify.db.execute<RowDataPacket[]>(`
                SELECT * FROM bans WHERE id = ?`,
                [req.params.id]
            )

            if(existing.length === 0) {
                return reply.code(404).send({
                    error: 'NOT_FOUND',
                    message: 'Ban not found',
                    statusCode: 404
                })
            }

            const ban = {
                ...existing[0],
                ...req.body
            }

            const [ok] = await fastify.db.execute<OkPacket>(`
                UPDATE bans 
                SET executor = :executor, reason = :reason, flags = :flags, 
                public_message = :public_message, expires = :expires 
                WHERE steamid = :steamid`,
                {
                    executor: ban.executor,
                    reason: ban.reason,
                    flags: ban.flags,
                    public_message: ban.public_message,
                    expires: ban.expires,
                    steamid: ban.steamid
                }
            )

            if(req.body.flags & 2 && ~existing[0].flags & 2) {
                fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'BAN_EDIT', `Suspended ban #${existing[0].id}`)
            } else if(~req.body.flags & 2 && existing[0].flags & 2) {
                fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'BAN_EDIT', `Resumed ban #${existing[0].id}`)
            } else {
                fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'BAN_EDIT', `Edited ban #${existing[0].id} details`)
            }

            return {
                changes: ok.affectedRows
            }
        }
    })

    fastify.route({
        url: '/:id', 
        method: 'DELETE',
        schema: {
            params: {
                id: {
                    type: 'number'
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        changes: { type: 'number' },
                        rawBan: { type: 'object' }
                    }
                }
            }
        },
        async handler(req: FastifyRequest<{ 
            Params: { id: number }
        }>, reply) {
            const [existing] = await fastify.db.execute<RowDataPacket[]>(`
                SELECT * FROM bans WHERE id = ?`,
                [req.params.id]
            )

            if(existing.length === 0) {
                return reply.code(404).send({
                    error: 'NOT_FOUND',
                    message: 'Ban not found',
                    statusCode: 404
                })
            }

            const [ok] = await fastify.db.execute<OkPacket>(
                `DELETE FROM bans WHERE id = ?`,
                [req.params.id]
            )

            fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'BAN_DELETE', `Deleted ban #${existing[0].id} for ${existing[0].steamid}`)

            return {
                changes: ok.affectedRows,
                rawBan: existing[0]
            }
        }
    })
}