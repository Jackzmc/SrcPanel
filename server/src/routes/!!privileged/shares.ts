import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import fs from 'fs/promises'
import path from 'path'

const WS_ITEMID_REGEX = new RegExp(/(\d+).vpk/)

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

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    fastify.get('/', async(req, reply) => {
        return {
            shares: fastify.servers.shares
        }
    })

    fastify.get('/:shareid', async(req: FastifyRequest<{Params: {'shareid'?: string}}>, reply) => {
        const shareId = req.params['shareid']
        const share = fastify.servers.getShare(shareId)
        return {
            share
        }
    })

    fastify.get('/:shareid/addons/:filename', async(req: FastifyRequest<{Params: {'shareid': string, filename: string}}>, reply) => {
        const shareId = req.params['shareid']
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be available, incorrecty configured or does not exist`   
            })
        }
        return {
           destinations: await fastify.servers.getAddonInfo(shareId, req.params.filename)
        }
    })

    fastify.post('/:shareid/addons/:filename/install/:destkey', async(req: FastifyRequest<{Params: {'shareid': string, filename: string, destkey: string}}>, reply) => {
        const shareId = req.params['shareid']
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be available, incorrecty configured or does not exist`   
            })
        } else if(!share.destinations[req.params.destkey]) {
            return reply.status(404).send({
                error: "Share Destination Not Found", 
                message: `Share does not have a destination of id \"${req.params.destkey}\".`   
            })
        }
        // Verify that the filename exists in the src:
        let addonInfo = await fastify.servers.getAddonInfo(shareId, req.params.filename)
        if(addonInfo) {
            try {
                const ln = `ln -sv "${share.sourceFolder}"/${req.params.filename}"${share.destinations[req.params.destkey]}"`
                fastify.log.debug(ln)
                await execPromise(`ln -sv "${share.sourceFolder}"/${req.params.filename} "${share.destinations[req.params.destkey]}"`)
                addonInfo[req.params.destkey] = true
                return {
                    success: true,
                    addonInfo
                }
            } catch(err) {
                fastify.log.error(err)
                return reply.code(500).send({
                    error: "Install Failed",
                    message: "Error occurred while installing addon"
                })
            }
        } else {
            return reply.status(404).send({
                error: "File not found", 
                message: `Share does not have a downloaded filename \"${req.params.filename}\".`   
            })
        }
    })

    // Might be smarter to merge this with install
    fastify.post('/:shareid/addons/:filename/uninstall/:destkey', async(req: FastifyRequest<{Params: {'shareid': string, filename: string, destkey: string}}>, reply) => {
        const shareId = req.params['shareid']
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be available, incorrecty configured or does not exist`   
            })
        } else if(!share.destinations[req.params.destkey]) {
            return reply.status(404).send({
                error: "Share Destination Not Found", 
                message: `Share does not have a destination of id \"${req.params.destkey}\".`   
            })
        }
        // Verify that the filename exists in the src:
        let addonInfo = await fastify.servers.getAddonInfo(shareId, req.params.filename)
        if(addonInfo) {
            try {
                await fs.unlink(path.join(share.destinations[req.params.destkey], req.params.filename))
                addonInfo[req.params.destkey] = false
                return {
                    success: true,
                    addonInfo
                }
            } catch(err) {
                fastify.log.error(err)
                return reply.code(500).send({
                    error: "Install Failed",
                    message: "Error occurred while installing addon"
                })
            }
        } else {
            return reply.status(404).send({
                error: "File not found", 
                message: `Share does not have a downloaded filename \"${req.params.filename}\".`   
            })
        }
    })

    fastify.get('/:shareid/addons', async(req: FastifyRequest<{Params: {'shareid'?: string}}>, reply) => {
        const shareId = req.params['shareid']
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be available, incorrecty configured or does not exist`   
            })
        }
        const dirents = await fs.readdir(share.sourceFolder, { withFileTypes: true }) 

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
                        shareInfo: await fastify.servers.getAddonInfo(shareId, dirent.name)
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
                    shareInfo: await fastify.servers.getAddonInfo(shareId, `${cacheBufferIds[i]}.vpk`)
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
                        shareInfo: await fastify.servers.getAddonInfo(shareId, `${WSResolverBuffer[i]}.vpk`),
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
            addons: results,
            shareDestinations: Object.keys(share.destinations)
        }

    })
}

import { exec } from 'child_process'

async function execPromise(command: string): Promise<string> {
    return new Promise(function(resolve, reject) {
        exec(command, (error: Error, stdout: string, stderr: string) => {
            if (error) {
                reject(error + "\n" + stderr.trim());
                return;
            }
            resolve(stdout.trim());
        });
    });
}