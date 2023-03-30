import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid'
import { FullAPIBan, APIBanFlags } from '../../../../common-types/Ban.js';
import { replaceObject } from '../../util.js';

const STEAM_WEB_APIKEY = process.env.STEAM_WEB_APIKEY

const PUTBanBody = Type.Object({
    steamid: Type.String(),
    executor: Type.Optional(Type.String()),
    reason: Type.Optional(Type.String()),
    flags: Type.Optional(Type.Integer()),
    expires: Type.Optional(Type.String()),
    public_message: Type.Optional(Type.String()),
})

type PUTBanBodyType = Static<typeof PUTBanBody>;

const POSTBanBody = Type.Object({
    executor: Type.Optional(Type.String()),
    reason: Type.Optional(Type.String()),
    flags: Type.Optional(Type.Integer()),
    expires: Type.Optional(Type.String()),
    public_message: Type.Optional(Type.String()),
})

type POSTBanBodyType = Static<typeof POSTBanBody>;

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.route({
        url: '/:id', 
        method: 'PUT',
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        banId: { type: 'number' },
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

            const ban = replaceObject<any>(existing[0], req.body)

            const [ok] = await fastify.db.execute<OkPacket>(`
                UPDATE bans 
                SET executor = :executor, reason = :reason, flags = :flags, 
                public_message = :public_message, expires = :expires 
                WHERE id = :id`,
                {
                    executor: ban.executor,
                    reason: ban.reason,
                    flags: ban.flags,
                    public_message: ban.public_message,
                    expires: ban.expires,
                    id: req.params.id
                }
            )

            if(req.body.flags & APIBanFlags.Suspended && ~existing[0].flags & APIBanFlags.Suspended) {
                fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'BAN_EDIT', `Suspended ban #${existing[0].id}`)
            } else if(~req.body.flags & APIBanFlags.Suspended && existing[0].flags & APIBanFlags.Suspended) {
                fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'BAN_EDIT', `Resumed ban #${existing[0].id}`)
            } else {
                fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'BAN_EDIT', `Edited ban #${existing[0].id} details`)
            }

            return {
                banId: ban.id,
                changes: ok.affectedRows
            }
        }
    })

    fastify.post(':/steamid', async(req: FastifyRequest<{ Body: POSTBanBodyType, Params: { steamid: string } }>, reply) => {
        if(!req.body.executor) {
            req.body.executor = req.session.user.steamid
        }
        if(req.params.steamid.length < 10) {
            return reply.status(400).send({
                error: "INVALID_STEAMID",
                message: "The steamid is invalid"
            })
        }
        if(this.authmngr.isAdmin(req.params.steamid)) {
            return reply.status(403).send({
                error: "IS_ADMIN",
                message: "Cannot ban a user with privileges, revoke the privileges first"
            })
        }

        const [existing] = await fastify.db.execute<RowDataPacket[]>(`
            SELECT * FROM bans WHERE steamid = ?`,
            [req.params.steamid]
        )

        if(existing.length > 0) {
            for(const ban of existing) {
                if(~ban.flags & APIBanFlags.Suspended) {
                    return reply.code(409).send({
                        error: 'BAN_EXISTS',
                        message: `User was already banned on non-suspended ban #${ban.id}`,
                        statusCode: 409
                    })
                }
            }
        }

        const ban = {
            ...req.body,
            steamid: req.params.steamid,
        }

        const [ok] = await fastify.db.execute<OkPacket>(`
            INSERT INTO bans (steamid, executor, reason, flags, public_message, expires, timestamp) 
            VALUES (:steamid, :executor, :reason, :flags, :public_message, :expires, UNIX_TIMESTAMP())`,
            {
                executor: ban.executor,
                reason: ban.reason ?? null,
                flags: ban.flags ?? 0,
                public_message: ban.public_message ?? null,
                expires: ban.expires ?? 0,
                steamid: ban.steamid
            }
        )

        await fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'BAN_ADD', `Add ban #${ok.insertId} for ${ban.steamid}`)

        return {
            banId: ok.insertId,
            success: true
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