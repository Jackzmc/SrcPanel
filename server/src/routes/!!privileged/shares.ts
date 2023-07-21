import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { exec } from 'child_process'
import FastifyMultipart from '@fastify/multipart'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { ChildWorkshopItem, ShareInfo } from '../../../../common-types/Share.js';
import { NO_PERMISSION } from '../../responses.js';
import { UserPrivilegeCode } from '../../../../common-types/Privileges.js';
const pump = promisify(pipeline)

const VALID_FILENAME_REGEX = new RegExp(/[a-z0-9_\- \.]+/i)


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {

    fastify.register(FastifyMultipart)


    fastify.get('/workshop/:publishedfileid/details', async(req: FastifyRequest<{Params: { publishedfileid: string }}>, reply) => {
        if(!req.user.hasPermission("shares.addons.view")) return NO_PERMISSION(reply)
        const results = await fastify.steam.getItemDetails([req.params.publishedfileid])
        if(results.length == 0) return { result: null }
        return {
            result: {
                ...results[0],
                consumer_app_title: results[0].consumer_app_id ? await fastify.steam.getAppName(results[0].consumer_app_id) : null
            }
        }
    })


    fastify.get('/', async(req: FastifyRequest<{Querystring: {full?: boolean}}>, reply) => {
        if(!req.user.hasPermission("shares.view")) return NO_PERMISSION(reply)
        return {
            shares: req.query.full ? fastify.servers.shares : fastify.servers.shareIds
        }
    })

    fastify.get('/:shareId', async(req: FastifyRequest<{Params: {shareId?: string}}>, reply) => {
        if(!req.user.hasPermission("shares.view", req.params.shareId)) return NO_PERMISSION(reply)
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
        if(!req.user.hasPermission("shares.addons.view", req.params.shareId)) return NO_PERMISSION(reply)
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
                ...share.export(),
                appTitle: (share.appId ? await fastify.steam.getAppName(share.appId) : null),
            }
        }

    })

    fastify.get('/:shareId/addons/:filename', async(req: FastifyRequest<{Params: {shareId: string, filename: string}}>, reply) => {
        if(!req.user.hasPermission("shares.addons.view", req.params.shareId, req.params.filename)) return NO_PERMISSION(reply)
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

    fastify.post('/:shareId/addons/upload',  async(req: FastifyRequest<{Params: {shareId: string}}>, reply) => {
        if(!req.user.hasPermission("shares.addons.upload.direct", req.params.shareId)) return NO_PERMISSION(reply)
        const shareId = req.params.shareId
        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be unavailable, incorrecty configured or does not exist`   
            })
        }

        const parts = req.files()
        for await (const part of parts) {
            const ext = part.filename.split(".").pop()
            if(!share.exts.includes(ext)) {
                // TODO: Possibly req.user.hasPermission check?
                return reply.status(400).send({
                    error: "TYPE_NOT_ALLOWED",
                    message: "The file type is not allowed for this share"
                })  
            }
            if(!VALID_FILENAME_REGEX.test(part.filename)) {
                return reply.status(400).send({
                    error: "INVALID_FILENAME",
                    message: `The filename must match the pattern /${VALID_FILENAME_REGEX.source}/`
                })  
            }
            await pump (part.file, share.createUploadStream(part.filename))
            await req.user.log(null, `uploaded addon %filename%`, {
                code: "shares.addons.upload.direct",
                metadata: {
                    filename: part.filename
                }
            })
            if (part.file.truncated) {
                console.warn(`${part.filename} is truncated, clearing downloaded piece`)
                await share.deleteAddon(part.filename)
                reply.send(new fastify.multipartErrors.FilesLimitError());    
            }
        }
        reply.send()
    })

    fastify.delete('/:shareId/addons/:filename', async(req: FastifyRequest<{Params: {shareId: string, filename: string}}>, reply) => {
        if(!req.params.filename) {
            return reply.status(401).send({
                error: "No filename provided", 
                message: `Filename is blank`   
            })
        }

        const shareId = req.params.shareId
        const [code, granted] = req.user.requirePermission("bans.edit", { resourceId: shareId })
        if(!granted) return NO_PERMISSION(reply)

        const share = fastify.servers.getShare(shareId)
        if(!share) {
            return reply.status(404).send({
                error: "Share Not Found", 
                message: `No share with id \"${shareId.toLowerCase()}\" could be found. Share may be unavailable, incorrecty configured or does not exist`   
            })
        }
        await share.deleteAddon(req.params.filename)
        await req.user.log(null, `deleted addon \"${req.params.filename}\"`, {
            code,
            metadata: {
                filename: req.params.filename
            }
        })
        return reply.status(204).send()
    })

    fastify.get('/:shareId/addons/:workshopId/download', async(req: FastifyRequest<{
        Params: {shareId: string, workshopId: string},
        Querystring: {'destinations'?: string, force?: boolean, sse?: boolean }
    }>, reply) => {
        let allowDownload = true
        const useSSE = req.query.sse
        function sendSSE(payload: any) {
            if(!useSSE) return
            return reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`)
        }
        async function send(payload: any, statusCode: number) {
            if(useSSE) return sendSSE(payload)
            else return await reply.status(statusCode).send(payload)
        }
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
        if(!req.user.hasPermission("shares.addons.upload.steam_workshop", req.params.shareId)) {
            await send({
                error: "No Permission",
                code: "NO_PERMISSION",
                message: `You do not have the ability to download addons from the steam workshop`
            }, 401)
        }
        const share = fastify.servers.getShare(req.params.shareId)
        if(!share) {
            const payload = {
                error: "Share Not Found", 
                code: "SHARE_NOT_FOUND",
                message: `No share with id \"${req.params.shareId.toLowerCase()}\" could be found. Share may be unavailable, incorrecty configured or does not exist`   
            }
            await send(payload, 404)
        } else if(!req.query.force && await share.isInstalled(`${req.params.workshopId}.vpk`)) {
            // This doesn't run when it is a collection, as collections themselves are not installed
            const addonInfo = await share.getAddonInfo(`${req.params.workshopId}.vpk`)
            if(addonInfo.workshop) {
                const latestWs = await fastify.steam.getItemDetails([req.params.workshopId])
                if(latestWs[0].time_updated == addonInfo.lastModified) {
                    // File is the same - ask for redownload
                    allowDownload = false
                    
                } else {
                    sendSSE({
                        code: 'NOTICE',
                        message: `Addon already installed but our version is out of date, updating...`
                    })
                }
            } else {
                // Ask for confirm to redownload if it's not a workshop item
                allowDownload = false
            }

            if(!allowDownload) {
                const payload = {
                    code: 'FILE_EXISTS',
                    error: "File exists",
                    filename: addonInfo.filename,
                    message: "The addon is already downloaded. " + (useSSE ? "Use Download to redownload" : "Provide ?force to force download.")
                }
                await send(payload, 409)
            }
        } 
        if(allowDownload) {
            try {
                sendSSE({state: "FETCH_INFO", message: "Fetching information from steam"})
                const children = await fastify.steam.getCollectionChildren(req.params.workshopId)
                let details: (ChildWorkshopItem)[] = []
                const [parentItem] = await fastify.steam.getItemDetails([req.params.workshopId])
                if(!children) {
                    details.push(parentItem)
                } else {
                    details = await fastify.steam.getItemDetails(children)
                    console.debug('got collection children', parentItem.title)
                    details
                        .filter(detail => detail.result === 1)
                        .map(detail => {
                        detail.collection = {
                            id: parentItem.publishedfileid,
                            name: parentItem.title
                        }
                        return detail
                    })
                }


                const downloadPromises = details.map(detail => {
                    return new Promise(async(resolve, reject) => {
                        if(!detail || !detail.file_url) {
                            console.log(detail)
                            sendSSE({
                                state: "DOWNLOADING",
                                error: true,
                                entry: detail.publishedfileid,
                                message: `Skipping ${detail.publishedfileid}: not found or no file published</a>`
                            })
                            return reject(new Error(`No file_url for ${detail.publishedfileid}`))
                        }
                        sendSSE({
                            state: "DOWNLOADING",
                            entry: detail.publishedfileid,
                            message: `Downloading <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${detail.publishedfileid}"><b>${detail.title}</b></a>`
                        })
                        await share.steamDownload(detail)
                        sendSSE({
                            state: "DOWNLOADED",
                            entry: detail.publishedfileid,
                            message: `Downloaded <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${detail.publishedfileid}"><b>${detail.title}</b></a> (${humanFileSize(detail.file_size)})`
                        })
                        await req.user.log(null, `downloaded workshop addon \"%title%\" (%filename%) for %share%`, {
                            code: "shares.addons.upload.steam_workshop." + detail.publishedfileid as UserPrivilegeCode,
                            metadata: {
                                type: "workshop",
                                share: share.id,
                                server: null,
                                filename: detail.publishedfileid + ".vpk",
                                title: detail.title,
                                size: detail.file_size
                            }
                        })
                        resolve(true)
                    })
                })

                await Promise.allSettled(downloadPromises)
                

                sendSSE({ state: "INSTALLING", message: "Installing addons to specified destinations" })

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
                                destResults[destKey][detail.publishedfileid] = { 
                                    result: "success"
                                }
                                await req.user.log(null, `enabled addon {filename} for "{share}/{server}"`, {
                                    code: "shares.addons.edit." + detail.publishedfileid as UserPrivilegeCode,
                                    metadata: {
                                        share: share.id,
                                        server: destKey,
                                        filename: filename
                                    }
                                })
                            } catch(err) {
                                sendSSE({state: "INSTALLING", message: `${err.code}: Failed to install ${detail.publishedfileid} for ${destKey}`, error: true })
                                console.warn(`[ShareInstaller] Install failed for ${destKey}/${detail.publishedfileid}: `, err)
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
                await send(payload, 500)
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

    fastify.post('/:shareId/addons/:filename/:operation/:destKey', async(req: FastifyRequest<{Params: {shareId: string, operation: string, filename: string, destKey: string}}>, reply) => {
        const isInstall = req.params.operation === "install"
        if(!isInstall && req.params.operation !== "uninstall") {
            return reply.status(400).send({
                error: "INVALID_OPERATION",
                message: `Operation must be of 'install' or 'uninstall', not ${req.params.operation}`
            })
        }
    
        const shareId = req.params.shareId
        const [code, granted] = req.user.requirePermission("shares.addons.edit", { resourceId: shareId })
        if(!granted) return NO_PERMISSION(reply)

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
                const method = isInstall ? share.install : share.uninstall
                await method(req.params.filename, req.params.destKey)
                await req.user.log(null, `${isInstall ? 'enabled' : 'disabled'} addon %filename% for %share%/%server%`, {
                    code,
                    metadata: {
                        share: share.id,
                        server: req.params.destKey,
                        filename: addonInfo.filename
                    }
                })
                addonInfo[req.params.destKey] = isInstall
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
