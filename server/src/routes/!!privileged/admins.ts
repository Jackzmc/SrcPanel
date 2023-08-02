import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid';
import { AdminData, ReadableAdminData } from '../../../../common-types/User';
import { APIBanFlags } from '../../../../common-types/Ban.js';
import { computeChanges } from '../../util.js';
import { NO_PERMISSION } from '../../responses.js';

const POSTAdmin = Type.Object({
    immunityLevel: Type.Number(),
    flags: Type.String(),
    groupIds: Type.Optional(Type.String()),
    name: Type.Optional(Type.String()),
    webCodes: Type.Optional(Type.Array(Type.String())),
})


const PUTAdmin = Type.Object({
    immunityLevel: Type.Optional(Type.Number()),
    flags: Type.Optional(Type.String()),
    groupIds: Type.Optional(Type.String()),
    webCodes: Type.Optional(Type.Array(Type.String())),
    name: Type.Optional(Type.String())
})

export type POSTAdminType = Static<typeof POSTAdmin>
export type PUTAdminType = Static<typeof PUTAdmin>

interface AddonListEntry {
    filename: string,
    workshop?: {
        deleted: boolean
        title: string,
        filesize: number,
    },
    shareInfo: Record<string, boolean>
}

interface AddonChildListEntry {
    filename: string,
    workshop?: {
        title: string,
        filesize: number,
    },
}

export const MAIN_DB = process.env.MYSQL_DB ? `\`${process.env.MYSQL_DB}\`` : null
export const ADMINS_DB = process.env.MYSQL_ADMINS_DB ? `\`${process.env.MYSQL_ADMINS_DB}\`` : null


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async(req, res) => {
        const admins = fastify.authmngr.getAdmins()
            .sort((a:AdminData|ReadableAdminData, b: AdminData|ReadableAdminData) => {
                const diff = b.permissions.immunityLevel - a.permissions.immunityLevel
                if(diff != 0) return diff
                return a.id - b.id
            })

        return {
            admins
        }
    })

    fastify.get('/groups', async(req, reply) => {
        const hasRoot = req.user.hasRoot;
        const groups = fastify.authmngr.GroupsExport
            .map(group => {
                let canApply = group.immunity < req.user.immunity && hasRoot
                if(!hasRoot) {
                    const flags: string[] = group.flags.split('')
                    // test if every flag in flags is in my flags
                    canApply = flags.every((flag: string) => req.user.flags.includes(flag))
                }

                return {
                    ...group,
                    canApply
                }
            })
            .sort(group => group.id)
        return {
            groups
        }
    })

    fastify.get('/discord', (req, reply) => {
        const inviteUri = fastify.config.GetKV("discord.link", process.env.DISCORD_INVITE_URI)
        if(!inviteUri)
            reply.send("No discord invite link was set, sorry.")
        else
            reply.redirect(301, process.env.DISCORD_INVITE_URI)
    })

    fastify.delete('/:steamid', async(req: FastifyRequest<{
        Params: { steamid: string }
    }>, reply) => {
        if(!req.user.hasPermission("admins.revoke")) return NO_PERMISSION(reply)
        if(req.params.steamid.length > 10) {
            const admin = fastify.authmngr.getAdmin(req.params.steamid)
            if(admin) {
                if(admin.permissions.immunityLevel >= req.session.permissions.immunityLevel) {
                    reply.code(403).send({
                        error: 'INVALID_IMMUNITY',
                        message: "Cannot revoke an admin who's immune to you",
                        statusCode: 403
                    })
                }

                await fastify.authmngr.revokeAdmin(admin.id)

                await req.user.log(admin.identity, `%client% revoked admin from %target% (#%id)`, {
                    code: "admins.revoke",
                    metadata: {
                        id: admin.id,
                    }
                })

                return reply.send({
                    success: true
                })
            } else {
                return reply.code(404).send({
                    error: "NOT_AN_ADMIN",
                    message: "The target user is not an admin."
                })
            }
        } else {
            return reply.code(400).send({
                error: "INVALID_STEAMID",
                message: "The steamid is invalid"
            })
        }
    })

    fastify.put('/:steamid',  async(req: FastifyRequest<{
        Params: { steamid: string },
        Body: PUTAdminType
    }>, reply) => {
        if(!req.user.hasPermission("admins.edit.others")) return NO_PERMISSION(reply, "You do not have permission to edit other users")
        if(req.params.steamid.length > 10) {
            const admin = fastify.authmngr.getAdmin(req.params.steamid)
            if(admin) {
                let immunity = req.body.immunityLevel
                if(immunity && immunity < 0) immunity = 0

                if(admin.permissions.immunityLevel >= req.session.permissions.immunityLevel) {
                    reply.code(403).send({
                        error: 'INVALID_IMMUNITY',
                        message: 'Cannot edit an admin at or above your immunity level',
                        statusCode: 403
                    })
                } else if(immunity >= req.session.permissions.immunityLevel) {
                    reply.code(403).send({
                        error: 'INVALID_IMMUNITY',
                        message: "Cannot set an admin's immunity to a level higher than your own",
                        statusCode: 403
                    })
                }

                const newAdminData = {
                    authtype: "steam" as "steam",
                    identity: req.params.steamid,
                    password: null,
                    name: req.body.name || "",
                    immunity,
                    flags: req.body.flags,
                    codes: req.body.webCodes as string[],
                    groupIds: req.body.groupIds ? req.body.groupIds.split(',') : []
                }
                const newAdmin = await fastify.authmngr.editAdmin(admin.id, newAdminData)

                await req.user.log(admin.identity, `%client% edited admin privileges #%id% for %target%`, {
                    code: "admins.edit",
                    metadata: {
                        id: admin.id,
                        ...computeChanges<any>(admin, newAdminData)
                    }
                })

                return {
                    meta: {
                        steamid: admin.identity,
                        adminId: admin.id
                    },
                    changes: newAdmin
                }
            } else {
                return reply.code(404).send({
                    error: 'ADMIN_DOES_NOT_EXIST',
                    message: "No admin exists with that steamid"
                })
            }
        } else {
            return reply.code(400).send({
                error: "INVALID_STEAMID",
                message: "The steamid is invalid"
            })
        }
        
    })

    fastify.post('/:steamid', async(req: FastifyRequest<{
        Params: { steamid: string },
        Body: POSTAdminType
    }>, reply) => {
        if(!req.user.hasPermission("admins.grant")) return NO_PERMISSION(reply)
        if(req.params.steamid.length > 10) {
            const steamid = req.params.steamid.slice(10)
            const [existing] = await fastify.db.execute<RowDataPacket[]>(`
                SELECT * FROM bans WHERE SUBSTRING(steamid, 11) = ? AND ~FLAGS & ${APIBanFlags.Suspended}`,
                [steamid]
            )
            if(existing.length > 0) {
                return reply.code(403).send({
                    error: 'POLICY_ERROR',
                    message: 'Cannot give privileges to a user who has any active bans',
                    statusCode: 403
                })
            }
            if(!fastify.authmngr.isAdmin(steamid)) {
                let immunity = req.body.immunityLevel || 0
                if(immunity < 0) immunity = 0

                if(immunity > req.session.permissions.immunityLevel) {
                    return reply.code(403).send({
                        error: 'INVALID_IMMUNITY',
                        message: 'You can only add admins to an immunity level at or below yours',
                        statusCode: 403
                    })
                }

                const groupIds = req.body.groupIds ? req.body.groupIds.split(',') : []
                const id = await fastify.authmngr.addAdmin({
                    authtype: "steam" as "steam",
                    identity: `STEAM_1:0:${steamid}`,
                    password: null,
                    name: req.body.name || "",
                    immunity,
                    flags: req.body.flags,
                    codes: req.body.webCodes,
                    groupIds
                })

                await req.user.log(req.params.steamid, `%client% granted admin to %target% (#%id)`, {
                    code: "admins.grant",
                    metadata: {
                        id,
                        immunity,
                        flags: req.body.flags,
                        groupIds,
                    }
                })

                return {
                    adminId: id
                }
            } else {
                return reply.code(409).send({
                    error: 'ADMIN_EXISTS',
                    message: "An admin account already exist with that steamid"
                })
            }
        } else {
            return reply.code(400).send({
                error: "INVALID_STEAMID",
                message: "The steamid is invalid"
            })
        }
    })  
}
