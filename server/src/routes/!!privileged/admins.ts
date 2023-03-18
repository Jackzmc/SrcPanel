import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid';
import { AdminGroup, APIAdminGroup, WebPermission } from '../../../../common-types/User.js';
import { AdminData, ReadableAdminData } from '../../../../common-types/User';
import { APIBanFlags } from '../../../../common-types/Ban.js';

const POSTAdmin = Type.Object({
    immunityLevel: Type.Number(),
    flags: Type.String(),
    groupIds: Type.Optional(Type.String()),
    webPermissions: Type.Optional(Type.Number()),
    name: Type.Optional(Type.String()),
    privileges: Type.Optional(Type.Record(Type.String(), Type.Number())),
})


const PUTAdmin = Type.Object({
    immunityLevel: Type.Optional(Type.Number()),
    flags: Type.Optional(Type.String()),
    groupIds: Type.Optional(Type.String()),
    webPermissions: Type.Optional(Type.Number()),
    privileges: Type.Optional(Type.Record(Type.String(), Type.Number())),
    name: Type.Optional(Type.String())
})

type POSTAdminType = Static<typeof POSTAdmin>
type PUTAdminType = Static<typeof PUTAdmin>

interface AddonListEntry {
    filename: string,
    workshop?: {
        deleted: boolean
        title: string,
        filesize: number,
        // children: AddonChildListEntry[]
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
                return a.name.localeCompare(b.name)
            })

        return {
            admins
        }
    })

    fastify.get('/groups', async(req, reply) => {
        const [rows] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT * FROM ${ADMINS_DB}.sm_groups LEFT JOIN ${ADMINS_DB}.sm_group_privileges as gp ON gp.group_id = sm_groups.id WHERE immunity_level < ?`,
            [req.session.permissions.immunityLevel]
        )
        const hasRoot = req.user.hasRoot
        const groups: Record<number, APIAdminGroup> = {}
        for(const row of rows) {
            let canApply = hasRoot
            if(!hasRoot) {
                const flags: string[] = row.flags.split()
                // test if every flag in flags is in my flags
                canApply = flags.every((flag: string) => req.user.flags.includes(flag))
            }

            if(!groups[row.id]) groups[row.id] = {
                id: row.id,
                flags: row.flags,
                name: row.name,
                immunity: row.immunity_level,
                privileges: {},
                canApply
            }
            if(row.service) {
                groups[row.id].privileges[row.service] = row.privilege
            }
        }
        return {
            groups: Object.values(groups).sort(group => group.id)
        }
    })

    fastify.get('/discord', (req, reply) => {
        if(!process.env.DISCORD_INVITE_URI)
            reply.send("No discord invite link was set, sorry.")
        else
            reply.redirect(301, process.env.DISCORD_INVITE_URI)
    })

    fastify.delete('/:steamid', async(req: FastifyRequest<{
        Params: { steamid: string }
    }>, reply) => {
        if(req.session.permissions.web.flags & WebPermission.ManageAdmins) {
            if(req.params.steamid.length > 10) {
                const steamid = req.params.steamid.slice(10)
                const admin = fastify.authmngr.getAdmin(steamid)
                if(admin) {
                    if(admin.permissions.immunityLevel >= req.session.permissions.immunityLevel) {
                        reply.code(403).send({
                            error: 'INVALID_IMMUNITY',
                            message: "Cannot revoke an admin who's immune to you",
                            statusCode: 403
                        })
                    }

                    await fastify.authmngr.revokeAdmin(admin.id)

                    await fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'ADMIN_DELETE', `Deleted admin #${admin.id} with steamid ${admin.identity}`)


                    reply.send({
                        success: true
                    })
                }
            } else {
                return reply.code(400).send({
                    error: "INVALID_STEAMID",
                    message: "The steamid is invalid"
                })
            }
        } else {
            return reply.code(401).send({
                error: "UNAUTHORIZED",
                message: "You do not have permission to manage admins"
            })
        }
    })

    fastify.put('/:steamid',  async(req: FastifyRequest<{
        Params: { steamid: string },
        Body: PUTAdminType
    }>, reply) => {
        if(req.session.permissions.web.flags & WebPermission.ManageAdmins) {
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

                    const newAdmin = await fastify.authmngr.editAdmin(admin.id, {
                        authtype: "steam",
                        identity: req.params.steamid,
                        password: null,
                        name: req.body.name || "",
                        immunity,
                        flags: req.body.flags,
                        privileges: req.body.privileges,
                        groupIds: req.body.groupIds ? req.body.groupIds.split(',') : []
                    }, req.body.webPermissions)

                    await fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'ADMIN_EDIT', `Changed permissions for admin id #${admin.id}`)

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
        } else {
            return reply.code(401).send({
                error: "UNAUTHORIZED",
                message: "You do not have permission to manage admins"
            })
        }
    })

    fastify.post('/:steamid', async(req: FastifyRequest<{
        Params: { steamid: string },
        Body: POSTAdminType
    }>, reply) => {
        if(req.session.permissions.web.flags & WebPermission.ManageAdmins) {
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

                    const id = await fastify.authmngr.addAdmin({
                        authtype: "steam",
                        identity: `STEAM_1:0:${steamid}`,
                        password: null,
                        name: req.body.name || "",
                        immunity,
                        flags: req.body.flags,
                        privileges: req.body.privileges,
                        groupIds: req.body.groupIds ? req.body.groupIds.split(',') : []
                    }, req.body.webPermissions)

                    await fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'ADMIN_ADD', `Added new admin with id #${id} (${req.params.steamid}). Immunity: ${immunity}, flags: "${req.body.flags}", groups: ${req.body.groupIds ?? '<none>'}`)


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
        } else {
            return reply.code(401).send({
                error: "UNAUTHORIZED",
                message: "You do not have permission to manage admins"
            })
        }
    })  
}