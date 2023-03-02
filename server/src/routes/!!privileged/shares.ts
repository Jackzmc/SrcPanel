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


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {

    fastify.get('/workshop/:publishedfileid/details', async(req: FastifyRequest<{Params: { publishedfileid: string }}>, reply) => {
        const results = await fastify.steam.getItemDetails([req.params.publishedfileid])
        if(results.length == 0) return { result: null }
        return {
            result: {
                ...results[0],
                consumer_app_title: results[0].consumer_app_id ? await fastify.steam.getAppName(results[0].consumer_app_id) : null
            }
        }
    })


    fastify.get('/', async(req, reply) => {
        return {
            shares: fastify.servers.shares
        }
    })

    fastify.get('/:shareId', async(req: FastifyRequest<{Params: {shareId?: string}}>, reply) => {
        const shareId = req.params.shareId
        const share = fastify.servers.getShare(shareId)
        return {
            share: {
                id: share.id,
                name: share.name,
                sourceFolder: share.sourceFolder,
                destinations: share.destinations,
                appId: share.appId,
                validExtenstions: share.exts,
                installSources: share.sources,
                appTitle: (share.appId ? await fastify.steam.getAppName(share.appId) : null)
            }
        }
    })


    fastify.get('/:shareId/addons', async(req: FastifyRequest<{Params: {shareId?: string}}>, reply) => {
        const shareId = req.params.shareId
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be unavailable, incorrecty configured or does not exist`   
            })
        }
        return {
            addons: await share.getAddons(),
            shareInfo: {
                id: share.id,
                name: share.name,
                appId: share.appId,
                appTitle: (share.appId ? await fastify.steam.getAppName(share.appId) : null),
                destinations: Object.values(share.destinations)
                    .map(dest => {
                        return {
                            id: dest.id,
                            name: dest.name,
                            serverIds: dest.serverIds
                        }
                    }),
                validExts: share.exts,
                downloadSources: share.sources
            }
        }

    })

    fastify.get('/:shareId/addons/:filename', async(req: FastifyRequest<{Params: {shareId: string, filename: string}}>, reply) => {
        if(!req.params.filename) {
            return reply.status(401).send({
                error: "No filename provided", 
                message: `Filename is blank`   
            })
        }
        const shareId = req.params.shareId
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be unavailable, incorrecty configured or does not exist`   
            })
        }
        return {
           addonInfo: await share.getAddonInfo(req.params.filename)
        }
    })

    fastify.get('/:shareId/addons/:workshopId/download', async(req: FastifyRequest<{
        Params: {shareId: string, workshopId: string},
        Querystring: {'destinations'?: string, force?: boolean, sse?: boolean }
    }>, reply) => {
        let allowDownload = true
        const useSSE = req.query.sse
        if(useSSE) {
            reply.raw.writeHead(200, {
                'Cache-Control': 'no-cache,no-transform',
                'Content-Type': 'text/event-stream',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            });
            reply.raw.flushHeaders()
            reply.raw.write('retry: 10000\n\n')
        }
        const share = fastify.servers.getShare(req.params.shareId)
        if(!share) {
            const payload = {
                error: "Share Not Found", 
                code: "SHARE_NOT_FOUND",
                message: `No share with id \"${req.params.shareId.toLowerCase()}\" could be found. Share may be unavailable, incorrecty configured or does not exist`   
            }
            useSSE ? reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`) : reply.status(404).send(payload)
        } else if(!req.query.force && await share.isInstalled(`${req.params.workshopId}.vpk`)) {
            const addonInfo = await share.getAddonInfo(`${req.params.workshopId}.vpk`)
            if(addonInfo.workshop) {
                const latestWs = await fastify.steam.getItemDetails([req.params.workshopId])
                if(latestWs[0].time_updated == addonInfo.lastModified) {
                    // File is the same - ask for redownload
                    allowDownload = false
                }

            } else {
                // Ask for confirm to redownload if it's not a workshop item
                allowDownload = false
            }

            if(!allowDownload) {
                const payload = {
                    code: 'FILE_EXISTS',
                    error: "File exists",
                    message: "The addon is already downloaded. " + (useSSE ? "Use Download to redownload" : "Provide ?force to force download.")
                }
                useSSE ? reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`) : reply.status(409).send(payload)
            }
        } else if(allowDownload) {
            try {
                if(useSSE) reply.raw.write(`data: {"state": "FETCH_INFO", "message": "Fetching information from steam"}\n\n`)
                const children = await fastify.steam.getCollectionChildren(req.params.workshopId)
                let details: WorkshopItem[] = []
                if(!children) {
                    details = await fastify.steam.getItemDetails([req.params.workshopId])
                } else {
                    details = await fastify.steam.getItemDetails(children)
                }

                const downloadPromises = details.map(detail => {
                    return new Promise(async(resolve) => {
                        if(useSSE) {
                            reply.raw.write(`data: ${JSON.stringify({
                                state: "DOWNLOADING",
                                entry: detail.publishedfileid,
                                message: `Downloading <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${detail.publishedfileid}"><b>${detail.title}</b></a>`
                            })}\n\n`)
                        }
                        await share.steamDownload(detail)
                        if(useSSE) reply.raw.write(`data: ${JSON.stringify({
                            state: "DOWNLOADING",
                            entry: detail.publishedfileid,
                            message: `Downloaded <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${detail.publishedfileid}"><b>${detail.title}</b></a> (${humanFileSize(detail.file_size)})`
                        })}\n\n`)
                        await fastify.authmngr.log.addWebEntry(req.session.user.steamid, "ADDON_DOWNLOAD", `Downloaded addon "${detail.title}" (${detail.publishedfileid}, ${humanFileSize(detail.file_size)})`)
                        resolve(true)
                    })
                })

                await Promise.allSettled(downloadPromises)
                

                if(useSSE) reply.raw.write(`data: {"state": "INSTALLING", "message": "Installing addons to specified destinations"}\n\n`)

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
                                await fastify.authmngr.log.addWebEntry(req.session.user.steamid, "ADDON_INSTALL", `Installed addon "${detail.title}" (${detail.publishedfileid}) to ${destKey}`)
                                destResults[destKey][detail.publishedfileid] = { 
                                    result: "success"
                                }
                            } catch(err) {
                                if(useSSE) reply.raw.write(`data: {"state": "INSTALLING", "message": "Failed to install ${detail.publishedfileid} for ${destKey}"\n\n`)
                                console.warn(`[ShareInstaller] Install fail for ${destKey}/${detail.publishedfileid}: `, err)
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

    fastify.post('/:shareId/addons/:filename/install/:destKey', async(req: FastifyRequest<{Params: {shareId: string, filename: string, destKey: string}}>, reply) => {
        const shareId = req.params.shareId
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be unavailable, incorrecty configured or does not exist`   
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
                await fastify.authmngr.log.addWebEntry(req.session.user.steamid, "ADDON_INSTALL", `Install addon "${addonInfo.filename}" to ${req.params.destKey}`)
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
    fastify.post('/:shareId/addons/:filename/uninstall/:destKey', async(req: FastifyRequest<{Params: {shareId: string, filename: string, destKey: string}}>, reply) => {
        const shareId = req.params.shareId
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be unavailable, incorrecty configured or does not exist`   
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

function humanFileSize(bytes: number, si=false, dp=1) {
    const thresh = si ? 1000 : 1024;
  
    if (Math.abs(bytes) < thresh) {
      return bytes + ' B';
    }
  
    const units = si 
      ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
      : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10**dp;
  
    do {
      bytes /= thresh;
      ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
  
  
    return bytes.toFixed(dp) + ' ' + units[u];
  }