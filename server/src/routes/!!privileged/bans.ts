import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { APIBanFlags } from '@srcpanel/common/Ban';
import { NO_PERMISSION, NOT_FOUND } from '../../util/responses.js';
import { AddBanBodySchema, EditBanBodySchema, type APIAddBanRequest, type APIEditBanRequest } from '@srcpanel/common/bans/schemas'
import * as BansRepo from '#/modules/bans/BansRepo.js'

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
            const existingBan = await BansRepo.getBan(fastify.db, req.params.id)
            if(!existingBan) {
                return NOT_FOUND(reply, "Ban")
            }
            // Check if they are creator or if CONSOLE (automatic ban), can always edit
            const isCreator = existingBan.executor.id === "CONSOLE" || req.user!.equals(existingBan.executor.id) 
            const [code, granted] = req.user!.requirePermission("bans.edit", { isCreator })
            if(!granted) return NO_PERMISSION(reply)

            // Make the user claim any automatic bans they edit:
            if(existingBan.executor.id === "CONSOLE") {
                req.body.executor = req.user!.steamid2
            }

            await BansRepo.updateBan(fastify.db, req.params.id, {
                executor: req.body.executor ?? existingBan.executor.id,
                reason: req.body.reason,
                publicReason: req.body.public_reason ?? null,
                flags: req.body.flags,
                expires: req.body.expires ?? null
            })
            
            const logPayload = {
                code,
                metadata: {
                    id: existingBan.id,
                }
            }

            const isSuspendedNow = req.body.flags 
                && (req.body.flags & APIBanFlags.Suspended) 
                && (~existingBan.flags & APIBanFlags.Suspended)
            const isActiveNow = req.body.flags 
                && (~req.body.flags & APIBanFlags.Suspended) 
                && (existingBan.flags & APIBanFlags.Suspended)

            if(isSuspendedNow) {
                await req.user!.log(existingBan.client.id, `%client% suspended ban #%id% for %target%`, logPayload)
            } else if(isActiveNow) {
                await req.user!.log(existingBan.client.id, `%client% reinstate ban #%id% for %target%`, logPayload)
            } else {
                await req.user!.log(existingBan.client.id, `%client% edited ban #%id%'s details for %target%`, logPayload)
            }

            return reply.status(204).send()
        }
    })

    // TODO: Moving steamid checks to /users/:steamid/bans ? or /bans/user/:steamid

    fastify.route({
        method: 'GET',
        url: '/user/:steamid',
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        ban: { type: 'object' },
                        appeals: { type: 'array', default: [] }
                    }
                }
            }
        },
        async handler(req: FastifyRequest<{ Params: { steamid: string } }>, reply) {
            const bans = await BansRepo.getBanForUser(fastify.db, req.params.steamid)

            const appeals = BansRepo.getAppealsForUser(fastify.db, req.params.steamid)

            return {
                bans,
                appeals
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
                        ban: { type: 'object' },
                        appeals: { type: 'array', default: [] }
                    }
                }
            }
        },
        async handler(req: FastifyRequest<{ Params: { id: number }, Querystring: { filter: string } }>, reply) {
            const ban = await BansRepo.getBan(fastify.db, req.params.id)
            // No appeals if no ban
            if(!ban) return NOT_FOUND(reply, "Ban")

            const appeals = BansRepo.getAppeals(fastify.db, ban.id)

            return {
                ban,
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

            const bans = await BansRepo.getBanForUser(fastify.db, req.params.steamid)

            if(bans.length > 0) {
                for(const ban of bans) {
                    if(~ban.flags & APIBanFlags.Suspended && !ban.expired) {
                        return reply.code(409).send({
                            error: 'BAN_EXISTS',
                            message: `User currently has an active ban: #${ban.id}`,
                            statusCode: 409
                        })
                    }
                }
            }


            const id = await BansRepo.insertBan(fastify.db, {
                steamid: req.params.steamid,
                executor: req.user!.steamid2,
                flags: req.body.flags ?? 0,
                reason: req.body.reason ?? null,
                publicReason: req.body.public_reason ?? null,
                expires: req.body.expires ?? 0,
            })

            await req.user!.log(req.params.steamid, `%client% banned user %target%`, {
                code: "bans.create",
                metadata: {
                    id, 
                    ...req.body
                }
            })

            return {
                id
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
            const existingBan = await BansRepo.getBan(fastify.db, req.params.id)

            if(!existingBan) {
                return NOT_FOUND(reply, "Ban")
            }
            // Check if they can edit this
            const isCreator = req.user!.equals(existingBan.executor.id) 
            const [code, granted] = req.user!.requirePermission("bans.delete", { isCreator })
            if(!granted) return NO_PERMISSION(reply)

            await BansRepo.deleteBan(fastify.db, req.params.id)

            await req.user!.log(existingBan.client.id, `%client% removed ban #%id% for %target%`, {
                code,
                metadata: {
                    id: existingBan.id, 
                }
            })
            

            return reply.status(204).send()
        }
    })

}
