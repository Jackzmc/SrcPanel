import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid';
import fs from 'fs/promises'

const POSTAdmin = Type.Object({
    immunityLevel: Type.Number(),
    flags: Type.String(),
    groupsIds: Type.Optional(Type.String()),
    webPermissions: Type.Optional(Type.Number())
})

type POSTAdminType = Static<typeof POSTAdmin>

interface AddonListEntry {
    filename: string,
    workshop?: {
        deleted: boolean
        title: string,
        filesize: number,
        // children: AddonChildListEntry[]
    }
}

interface AddonChildListEntry {
    filename: string,
    workshop?: {
        title: string,
        filesize: number,
    }
}



const ADDONS_FOLDER = process.env.ADDONS_FOLDER

const WS_ITEMID_REGEX = new RegExp(/(\d+).vpk/)


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.addHook('preHandler', async(req, reply) => {
        await fastify.authmngr.verify(req, reply)
    })

    fastify.get('/discord', (req, reply) => {
        if(!process.env.DISCORD_INVITE_URI)
            reply.send("No discord invite link was set, sorry.")
        else
            reply.redirect(301, process.env.DISCORD_INVITE_URI)
    })

    fastify.get('/addons', async(req, reply) => {
        const dirents = await fs.readdir(ADDONS_FOLDER, { withFileTypes: true }) 
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
                    })
                }
            }
        }

        const WSResolverBuffer = []
        const cacheResults = await fastify.cache.mGet(cacheBufferKeys)
        for(let i = 0; i < cacheResults.length; i++) {
            const result = null//cacheResults[i]
            if(result) {
                results.push({
                    filename: cacheBufferIds[i],
                    workshop: JSON.parse(result)
                })
            } else {
                WSResolverBuffer.push(cacheBufferIds[i])
            }
        }

        if(WSResolverBuffer.length > 0) {
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
                    workshop
                })

                // This will be slow, but should only run once or twice
                await fastify.cache.set(`workshop.${wsDetails[i].publishedfileid}`, JSON.stringify(workshop))
            }
        }

        return {
            addons: results
        }

    })

    fastify.post('/:steamid', async(req: FastifyRequest<{
        Params: { steamid: string },
        Querystring: POSTAdminType
    }>, reply) => {
        const steamid = new SteamID(req.params.steamid)
        if(steamid.isValid()) {
            if(!fastify.authmngr.isAdmin(steamid)) {
                let immunity = req.query.immunityLevel || 0
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
                    identity: steamid.getSteam2RenderedID(),
                    password: null,
                    name: "",
                    immunity,
                    flags: req.query.flags,
                
                    groupIds: req.query.groupsIds ? req.query.groupsIds.split(",") : []
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