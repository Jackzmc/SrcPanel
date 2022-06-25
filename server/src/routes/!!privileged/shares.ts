import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { WorkshopItem } from '../../modules/steam.js';


const WS_ITEMID_REGEX = new RegExp(/(\d+).vpk/)

interface AddonListEntry {
    filename: string,
    workshop?: {
        deleted: boolean
        title: string,
        filesize: number,
        lastUpdated: number
        // children: AddonChildListEntry[]
    }, 
    filesize?: number,
    lastModified?: number
    shareInfo: Record<string, boolean>
}

interface AddonChildListEntry {
    filename: string,
    workshop?: {
        title: string,
        filesize: number,
    },
}
import ServerSideEventHandler from 'fastify-sse'

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {



    fastify.get('/', async(req, reply) => {
        return {
            shares: fastify.servers.shares
        }
    })

    fastify.get('/:shareId', async(req: FastifyRequest<{Params: {shareId?: string}}>, reply) => {
        const shareId = req.params.shareId
        const share = fastify.servers.getShare(shareId)
        return {
            share
        }
    })

    fastify.get('/:shareId/addons/:filename', async(req: FastifyRequest<{Params: {shareId: string, filename: string}}>, reply) => {
        const shareId = req.params.shareId
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be available, incorrecty configured or does not exist`   
            })
        }
        return {
           destinations: await share.getAddonInfo(req.params.filename)
        }
    })

    fastify.get('/:shareId/addons/:workshopId/download', async(req: FastifyRequest<{
        Params: {shareId: string, workshopId: string},
        Querystring: {'destinations'?: string, force?: boolean, sse?: boolean }
    }>, reply) => {
        const useSSE = req.query.sse
        if(useSSE) {
            reply.raw.writeHead(200, {
                'Cache-Control': 'no-cache,no-transform',
                'Content-Type': 'text/event-stream',
                'Connection': 'keep-alive'
            });
            reply.raw.flushHeaders()
            reply.raw.write('retry: 10000\n\n')
        }
        const share = fastify.servers.getShare(req.params.shareId)
        if(!share) {
            const payload = {
                error: "Share Not Found", 
                message: `No share with id \"${req.params.shareId.toLowerCase()}\" could be found. Share may be available, incorrecty configured or does not exist`   
            }
            useSSE ? reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`) : reply.status(404).send(payload)
        } else if(!req.query.force && await share.isInstalled(`${req.params.workshopId}.vpk`)) {
            const payload = {
                code: 'FILE_EXISTS',
                error: "File exists",
                message: "The addon is already downloaded. Provide ?force to force download."
            }
            useSSE ? reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`) : reply.status(409).send(payload)
        } else {
            try {
                if(useSSE) reply.raw.write(`data: {"state": "FETCH_INFO", "message": "Fetching information from steam"}\n\n`)
                const children = await fastify.steam.getCollectionChildren(req.params.workshopId)
                let details: WorkshopItem[] = []
                if(!children) {
                    details = await fastify.steam.getItemDetails([req.params.workshopId])
                } else {
                    details = await fastify.steam.getItemDetails(children)
                }

                for(const detail of details) {
                    if(useSSE) reply.raw.write(`data: {"state": "DOWNLOADING", "entry": ${detail.publishedfileid}, "message": "Downloading "${detail.title}" (${detail.publishedfileid})"\n\n`)
                    await share.steamDownload(detail)
                }

                if(useSSE) reply.raw.write(`data: {"state": "INSTALLING", "message": "Installing addons to destinations"}\n\n`)

                let destResults: Record<string, Record<string, {result: "success" | "error", error?: string }>> = undefined
                if(req.query.destinations) {
                    destResults = {}
                    const dests = req.query.destinations.split(",")
                    for(const destKey of dests) {
                        destResults[destKey] = {}
                        for(const detail of details) {
                            try {
                                const filename = `${detail.publishedfileid}.vpk`
                                await share.install(filename, destKey)
                                destResults[destKey][detail.publishedfileid].result = "success"
                            } catch(err) {
                                if(useSSE) reply.raw.write(`data: {"state": "INSTALLING", "message": "Install failed for ${destKey}/${detail.publishedfileid}"}\n\n`)
                                destResults[destKey][detail.publishedfileid] = {
                                    result: "error",
                                    error: err.message
                                }
                            }

                        }
                    }
                }

                if(!useSSE) {
                    return {
                        results: destResults
                    }
                }
            } catch(error) {
                const payload = {
                    code: 'STEAM_ERROR',
                    error,
                    message: "An error occurred while fetching info or downloading the addon",
                }
                useSSE ? reply.raw.write(`data: ${JSON.stringify(payload)}`) : reply.status(500).send(payload)
            }
        }
        if(useSSE) {
            reply.raw.write(`data: {"state": "COMPLETE"}\n\n`)
            // Let the client terminate the connection:
            reply.hijack()
            // Timeout if they haven't killed it
            setTimeout(() => reply.raw.end(), 10000)
        }
    })

    fastify.post('/:shareId/addons/:filename/install/:destkey', async(req: FastifyRequest<{Params: {shareId: string, filename: string, destKey: string}}>, reply) => {
        const shareId = req.params.shareId
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be available, incorrecty configured or does not exist`   
            })
        } else if(!share.destinations[req.params.destKey]) {
            return reply.status(404).send({
                error: "Share Destination Not Found", 
                message: `Share does not have a destination of id \"${req.params.destKey}\".`   
            })
        }
        // Verify that the filename exists in the src:
        let addonInfo = await share.getAddonInfo(req.params.filename)
        if(addonInfo) {
            try {
                await share.install(req.params.filename, req.params.destKey)
                addonInfo[req.params.destKey] = true
                return {
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
    fastify.post('/:shareId/addons/:filename/uninstall/:destkey', async(req: FastifyRequest<{Params: {shareId: string, filename: string, destKey: string}}>, reply) => {
        const shareId = req.params.shareId
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be available, incorrecty configured or does not exist`   
            })
        } else if(!share.destinations[req.params.destKey]) {
            return reply.status(404).send({
                error: "Share Destination Not Found", 
                message: `Share does not have a destination of id \"${req.params.destKey}\".`   
            })
        }
        // Verify that the filename exists in the src:
        let addonInfo = await share.getAddonInfo(req.params.filename)
        if(addonInfo) {
            try {
                await share.uninstall(req.params.filename, req.params.destKey)
                addonInfo[req.params.destKey] = true
                return {
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

    fastify.get('/:shareId/addons', async(req: FastifyRequest<{Params: {shareId?: string}}>, reply) => {
        const shareId = req.params.shareId
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
                    const stat = await fs.stat(path.join(share.sourceFolder, dirent.name))
                    results.push({
                        filename: dirent.name.slice(0, -4),
                        filesize: stat.size,
                        lastModified: Math.round(stat.mtime.getTime() / 1000),
                        shareInfo: await share.getAddonInfo(dirent.name)
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
                    shareInfo: await share.getAddonInfo(`${cacheBufferIds[i]}.vpk`)
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
                        shareInfo: await share.getAddonInfo(`${WSResolverBuffer[i]}.vpk`),
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
