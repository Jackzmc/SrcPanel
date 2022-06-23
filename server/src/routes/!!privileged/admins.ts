import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid';
import fs from 'fs/promises'
import { AdminGroup, WebPermission } from '../../../../common-types/User.js';

const POSTAdmin = Type.Object({
    immunityLevel: Type.Number(),
    flags: Type.String(),
    groupIds: Type.Optional(Type.String()),
    webPermissions: Type.Optional(Type.Number()),
    name: Type.Optional(Type.String())
})


const PUTAdmin = Type.Object({
    immunityLevel: Type.Optional(Type.Number()),
    flags: Type.Optional(Type.String()),
    groupIds: Type.Optional(Type.String()),
    webPermissions: Type.Optional(Type.Number()),
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
    shares: Record<string, Record<string, boolean> | undefined>
}

interface AddonChildListEntry {
    filename: string,
    workshop?: {
        title: string,
        filesize: number,
    },
}

const ADDONS_FOLDER = process.env.ADDONS_FOLDER
export const MAIN_DB = process.env.MYSQL_DB ? `\`${process.env.MYSQL_DB}\`` : null
export const ADMINS_DB = process.env.MYSQL_ADMINS_DB ? `\`${process.env.MYSQL_ADMINS_DB}\`` : null

const WS_ITEMID_REGEX = new RegExp(/(\d+).vpk/)

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async(req, res) => {
        const admins = fastify.authmngr.getAdmins()

        return {
            admins
        }
    })

    fastify.get('/groups', async(req, reply) => {
        const [rows] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT * FROM ${ADMINS_DB}.sm_groups WHERE immunity_level < ?`,
            [req.session.permissions.immunityLevel]
        )
        const hasRoot = req.session.permissions.flags?.includes('z')
        return {
            groups: rows
                .filter(row => {
                    if(hasRoot) return true
                    const flags: string[] = row.flags.split()
                    // test if every flag in flags is in my flags
                    return flags.every((flag: string) => req.session.permissions.flags?.includes(flag))
                })
                .map(row => {
                    return {
                        id: row.id,
                        flags: row.flags,
                        name: row.name,
                        immunity: row.immunity_level
                    } as unknown as AdminGroup
                }) as AdminGroup[]
        }
    })

    fastify.get('/discord', (req, reply) => {
        if(!process.env.DISCORD_INVITE_URI)
            reply.send("No discord invite link was set, sorry.")
        else
            reply.redirect(301, process.env.DISCORD_INVITE_URI)
    })

    /*
        Fetch all files in directory
        For every entry:
            If entry has workshop item:
                Put in redis cache queue for `workshop[itemid]`
            else:
                Put in result array
        If redis cache queue is not empty:
            Fetch all items in redis cache queue and map to result array
        Somehow, if item not in redis cache results:
            For very item in cache result array:
                Put item in resolve buffer
            If any item in resolve buffer:
                Resolve details
                For every item in resolve results array:
                    Push in cache (no buffer, should only be bad performance for first bulk )
                    Put item in result array
    */
    fastify.get('/addons', async(req, reply): Promise<{addons: AddonChildListEntry[]}> => {
        const dirents = await fs.readdir(ADDONS_FOLDER, { withFileTypes: true }) 

        const results: AddonListEntry[] = []
        const cacheBufferKeys = []
        const cacheBufferIds = []

        for(const dirent of dirents) {
            if(dirent.isFile() && dirent.name.endsWith(".vpk")) {
                const match = dirent.name.match(WS_ITEMID_REGEX)
                if(match && match.length == 2) {
                    cacheBufferKeys.push(`workshop.${match[1]}`)
                    cacheBufferIds.push(match[1])
                } else {
                    results.push({
                        filename: dirent.name.slice(0, -4),
                        shares: await fastify.servers.getAddonInfo(dirent.name)
                    })
                }
            }
        }

        const WSResolverBuffer = []
        
        // Because redis errors on empty array. which is fucking stupid but alright
        const cacheResults = cacheBufferKeys.length > 0 ? await fastify.cache.mGet(cacheBufferKeys) : []
        for(let i = 0; i < cacheResults.length; i++) {
            const result = null//cacheResults[i]
            if(result) {
                results.push({
                    filename: cacheBufferIds[i],
                    workshop: JSON.parse(result),
                    shares: await fastify.servers.getAddonInfo(`${cacheBufferIds[i]}.vpk`)
                })
            } else {
                WSResolverBuffer.push(cacheBufferIds[i])
            }
        }

        if(WSResolverBuffer.length > 0) {
            try {
                const wsDetails = await fastify.steam.getItemDetails(WSResolverBuffer)
                for(let i = 0; i < wsDetails.length; i++) {
                    const workshop = {
                        deleted: wsDetails[i].title === undefined,
                        title: wsDetails[i].title,
                        filesize: wsDetails[i].file_size,
                        fileUrl: wsDetails[i].file_url,
                        previewUrl: wsDetails[i].preview_url,
                        description: wsDetails[i].description,
                        lastUpdated: wsDetails[i].time_updated
                    }

                    results.push({
                        filename: WSResolverBuffer[i],
                        shares: await fastify.servers.getAddonInfo(`${WSResolverBuffer[i]}.vpk`),
                        workshop
                    })

                    // This will be slow, but should only run once or twice
                    await fastify.cache.set(`workshop.${wsDetails[i].publishedfileid}`, JSON.stringify(workshop))
                }
            } catch(err) {
                fastify.log.error("Error resolving WSResolverBuffer, getItemDetails errored: " + err)
            }
        }
        return {
            addons: results
        }

    })

    fastify.delete('/:steamid', async(req: FastifyRequest<{
        Params: { steamid: string }
    }>, reply) => {
        if(req.session.permissions.web.flags & WebPermission.ManageAdmins) {
            const steamid = new SteamID(req.params.steamid)
            if(steamid.isValid()) {
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
            const steamid = new SteamID(req.params.steamid)
            if(steamid.isValid()) {
                const admin = fastify.authmngr.getAdmin(steamid)
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
                        identity: steamid.getSteam2RenderedID(true),
                        password: null,
                        name: req.body.name || "",
                        immunity,
                        flags: req.body.flags,
                    
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
            const steamid = new SteamID(req.params.steamid)
            if(steamid.isValid()) {
                if(!fastify.authmngr.isAdmin(steamid)) {
                    let immunity = req.body.immunityLevel || 0
                    if(immunity < 0) immunity = 0

                    if(immunity > req.session.permissions.immunityLevel) {
                        reply.code(403).send({
                            error: 'INVALID_IMMUNITY',
                            message: 'You can only add admins to an immunity level at or below yours',
                            statusCode: 403
                        })
                    }

                    const id = await fastify.authmngr.addAdmin({
                        authtype: "steam",
                        identity: steamid.getSteam2RenderedID(true),
                        password: null,
                        name: req.body.name || "",
                        immunity,
                        flags: req.body.flags,
                    
                        groupIds: req.body.groupIds ? req.body.groupIds.split(',') : []
                    }, req.body.webPermissions)

                    await fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'ADMIN_ADD', `Added new admin with id #${id}. Immunity: ${immunity}, flags: ${req.body.flags}, groups: ${req.body.groupIds ?? '<none>'}`)


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