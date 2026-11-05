import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { APIBanFlags, FullAPIBan } from '@srcpanel/common/Ban';
import { computeChanges, replaceObject } from '../../util/index.js';
import { NO_PERMISSION, NOT_FOUND } from '../../util/responses.js';
import { TABLE_PREFIX } from '../../core/database.js';
import { AddBanBodySchema, EditBanBodySchema, type APIAddBanRequest, type APIEditBanRequest } from '@srcpanel/common/bans/schemas'

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.route({
        url: '/:id', 
        method: 'PUT',
        schema: {
            body: EditBanBodySchema,
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
                type: "object",
                properties: {
                    id: { type: 'number' }
                }
            }
        },
        async handler(req: FastifyRequest<{ Body: APIEditBanRequest, Params: { id: number } }>, reply) {
            if(!req.user!.hasPermission("bans.edit")) return NO_PERMISSION(reply)
            const [existing] = await fastify.db.execute<RowDataPacket[]>(`
                SELECT * FROM bans WHERE id = ?`,
                [req.params.id]
            )

            if(existing.length === 0) {
                return NOT_FOUND(reply, "Ban")
            }
            // Check if they are creator or if CONSOLE (automatic ban), can always edit
            const isCreator = existing[0].executor === "CONSOLE" || req.user!.equals(existing[0].executor) 
            const [code, granted] = req.user!.requirePermission("bans.edit", { isCreator })
            if(!granted) return NO_PERMISSION(reply)

            const ban = replaceObject<any>(existing[0], req.body)
            // Make the user claim any automatic bans they edit:
            if(existing[0].executor === "CONSOLE") {
                ban.executor = req.user!.steamid2
            }

            const [ok] = await fastify.db.execute<ResultSetHeader>(`
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
            const logPayload = {
                code,
                metadata: {
                    ...computeChanges<any>(existing[0], ban),
                    id: existing[0].id, // After spread, incase it returns null
                }
            }

            if(req.body.flags && req.body.flags & APIBanFlags.Suspended && ~existing[0].flags & APIBanFlags.Suspended) {
                await req.user!.log(existing[0].steamid, `%client% suspended ban #%id% for %target%`, logPayload)
            } else if(req.body.flags && ~req.body.flags & APIBanFlags.Suspended && existing[0].flags & APIBanFlags.Suspended) {
                await req.user!.log(existing[0].steamid, `%client% reinstate ban #%id% for %target%`, logPayload)
            } else {
                await req.user!.log(existing[0].steamid, `%client% edited ban #%id%'s details for %target%`, logPayload)
            }

            return {
                banId: ban.id,
                changes: ok.affectedRows
            }
        }
    })

    fastify.route({
        method: 'GET',
        url: '/:id',
        schema: {
            params: {
            type: "object",
            properties: {
                id: { type: 'string' }
            }
            },
            querystring: {
            type: "object",
            properties: {
                filter: { type: 'string' }
            }
            },
            response: {
            200: {
                type: 'object',
                properties: {
                meta: { type: 'object' },
                bans: { type: 'array', default: [] },
                appeals: { type: 'array', default: [] }
                }
            }
            }
        },
        async handler(req: FastifyRequest<{ Params: { id: string }, Querystring: { filter: string } }>, reply) {
            const id = req.params.id
            const isAccount = id.startsWith("STEAM_")

            const fetchStart = Date.now()
            const [bans] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT 
                times_tried, 
                id, 
                public_message, 
                bans.flags, 
                bans.steamid, 
                bans.executor, 
                bans.reason, 
                expires, 
                expired, 
                bans.timestamp, 
                u1.last_name as client_name, 
                u2.last_name AS executor_name, 
                ip
            FROM bans
            LEFT JOIN view_${TABLE_PREFIX}_user u1 ON u1.account_id = SUBSTRING(bans.steamid, 11)
            LEFT JOIN view_${TABLE_PREFIX}_user u2 ON u2.account_id = SUBSTRING(bans.executor, 11)
            WHERE 
                bans.id = ? 
                OR u1.account_id = SUBSTRING(?, 11)`,
            [id, id]
            )
            const fetchTime = Date.now() - fetchStart

            const apiBans: FullAPIBan[] = bans
            .filter(ban => req.query.filter !== "active" && !ban.expired && !(ban.flags & APIBanFlags.Suspended))
            .map(ban => {
                return {
                id: ban.id,
                client: {
                    id: ban.client,
                    name: ban.client_name,
                    country: ban.country
                },
                reason: ban.reason,
                flags: ban.flags,
                timestamp: Number(ban.timestamp),
                publicReason: ban.public_message,
                executor: {
                    id: ban.executor,
                    name: ban.executor_name,
                },
                expires: ban.expires,
                expired: ban.expired,
                joinAttempts: ban.times_tried,
                ip: ban.ip,
                }
            })

            const parseStart = Date.now()
            const parseTime = Date.now() - parseStart

            // Skip a query if it's for a user
            const [appeals] = isAccount 
            ? []
            : await fastify.db.execute(
                "SELECT * FROM `ban_appeals` WHERE `ban_id` = ?",
                [id]
            )

            console.debug('apeals end')

            return {
            meta: {
                fetchTime,
                parseTime,
                totalTime: fetchTime + parseTime,
            },
            bans: apiBans,
            appeals
            }
        }
    })

    fastify.post(
        '/:steamid', 
        { schema: { body: AddBanBodySchema }},
        async(req: FastifyRequest<{ Body: APIAddBanRequest, Params: { steamid: string } }>, reply) => {
            if(!req.user!.hasPermission("bans.create")) return NO_PERMISSION(reply)
            if(req.params.steamid.length < 10) {
                return reply.status(400).send({
                    error: "INVALID_STEAMID",
                    message: "The steamid is invalid"
                })
            } else if(fastify.authmngr.isAdmin(req.params.steamid)) {
                return reply.status(403).send({
                    error: "IS_ADMIN",
                    message: "Cannot ban a user with privileges, revoke the privileges first"
                })
            }

            const [existing] = await fastify.db.execute<RowDataPacket[]>(`
                SELECT * FROM bans WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)`,
                [req.params.steamid]
            )

            if(existing.length > 0) {
                for(const ban of existing) {
                    if(~ban.flags & APIBanFlags.Suspended && !ban.expired) {
                        return reply.code(409).send({
                            error: 'BAN_EXISTS',
                            message: `User currently has an active ban: #${ban.id}`,
                            statusCode: 409
                        })
                    }
                }
            }


            const [ok] = await fastify.db.execute<ResultSetHeader>(
                `INSERT INTO bans (steamid, executor, reason, flags, public_message, expires, timestamp) 
                VALUES (:steamid, :executor, :reason, :flags, :public_message, :expires, UNIX_TIMESTAMP())`,
                {
                    executor: req.user!.steamid2,
                    reason: req.body.reason ?? null,
                    flags: req.body.flags ?? 0,
                    public_message: req.body.public_reason ?? null,
                    expires: req.body.expires ?? 0,
                    steamid: req.params.steamid
                }
            )

            await req.user!.log(req.params.steamid, `%client% banned user %target%`, {
                code: "bans.create",
                metadata: {
                    id: ok.insertId, 
                    ...req.body
                }
            })

            return {
                banId: ok.insertId,
                success: true
            }
        }
    )

    fastify.route({
        url: '/:id', 
        method: 'DELETE',
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: 'number' }
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
            if(!req.user!.hasPermission("bans.delete")) return NO_PERMISSION(reply)
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
            // Check if they can edit this
            const isCreator = req.user!.equals(existing[0].executor) 
            const [code, granted] = req.user!.requirePermission("bans.delete", { isCreator })
            if(!granted) return NO_PERMISSION(reply)

            const [ok] = await fastify.db.execute<ResultSetHeader>(
                `DELETE FROM bans WHERE id = ?`,
                [req.params.id]
            )

            await req.user!.log(existing[0].steamid, `%client% removed ban #%id% for %target%`, {
                code,
                metadata: {
                    id: existing[0].id, 
                }
            })
            

            return {
                changes: ok.affectedRows,
                rawBan: existing[0]
            }
        }
    })

}
