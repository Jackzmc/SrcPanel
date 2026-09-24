import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import FastifyMultipart from '@fastify/multipart'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { AddonCollectionInfo, AddonInfo, ChildWorkshopItem, DetailsResponse, WorkshopItem } from '@srcpanel/common/Share';
import { NO_PERMISSION } from '../../responses.js';
import { UserPrivilegeCode } from '@srcpanel/common/Privileges';
import { createReadStream } from 'fs';
import path from 'path';
import assert from 'assert';
import { log } from 'console';
const pump = promisify(pipeline)

const VALID_FILENAME_REGEX = new RegExp(/[a-z0-9_\- .]+/i)
const UPLOAD_MAX_FILESIZE_BYTES = 1000 * 1000 * 1000 * 5 // 5 GB

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {

  fastify.register(FastifyMultipart, {
    limits: {
      fileSize: UPLOAD_MAX_FILESIZE_BYTES
    }
  })


  fastify.get('/workshop/:publishedfileid/details', async (req: FastifyRequest<{ Params: { publishedfileid: string } }>, reply): Promise<DetailsResponse> => {
    if (!req.user!.hasPermission("shares.addons.view")) return NO_PERMISSION(reply)
    const results = await fastify.steam.getItemDetails([req.params.publishedfileid])
    if (results.length == 0) return { type: "none", item: null }
    const children = await fastify.steam.getCollectionChildren(req.params.publishedfileid)
    const item = {
      ...results[0],
      consumer_app_title: results[0].consumer_app_id ? await fastify.steam.getAppName(results[0].consumer_app_id) : null,
    }
    if (children) {
      const childrenDetails = await fastify.steam.getItemDetails(children)
      return {
        item,
        type: "collection",
        children: childrenDetails
      }
    } else {
      return {
        item,
        type: "item"
      }
    }
  })

  fastify.get('/workshop/search/:appid', async (req: FastifyRequest<{ Params: { appid: string }, Querystring: { query: string } }>, reply): Promise<{ results: WorkshopItem[] }> => {
    if (!req.user!.hasPermission("shares.addons.view")) return NO_PERMISSION(reply)
    const results = await fastify.steam.searchItems(req.query.query, req.params.appid)
    return {
      results: results
    }
  })


  fastify.get('/', async (req: FastifyRequest, reply) => {
    if (!req.user!.hasPermission("shares.view")) return NO_PERMISSION(reply)
    return fastify.servers.shares
  })

  fastify.get('/:shareId', async (req: FastifyRequest<{ Params: { shareId?: string } }>, reply) => {
    if (!req.user!.hasPermission("shares.view", req.params.shareId)) return NO_PERMISSION(reply)
    const shareId = req.params.shareId
    const share = fastify.servers.getShare(shareId)
    if (!share) {
      return reply.status(404).send({
        error: "Share Not Found",
        message: `No share with id "${shareId!.toLowerCase()}" could be found. Share may be unavailable, incorrecty configured or does not exist`
      })
    }
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

  fastify.post(':/shareId/restart-servers', async (req: FastifyRequest<{ Params: { shareId: string, destId: string } }>, reply) => {
    if (!req.user!.hasPermission("shares.view", req.params.shareId)) return NO_PERMISSION(reply)
    const shareId = req.params.shareId
    const share = fastify.servers.getShare(shareId)
    if (!share) {
      return reply.status(404).send({
        error: "SHARE_NOT_FOUND",
        message: `No share with id "${shareId!.toLowerCase()}" could be found. Share may be unavailable, incorrecty configured or does not exist`
      })
    } else if (!share.destinations[req.params.destId]) {
      return reply.status(404).send({
        error: "SHARE_DEST_NOT_FOUND",
        message: `Share has no destination id "${shareId!.toLowerCase()}"`
      })
    }

    const dest = share.destinations[req.params.destId]

    const success: string[] = []
    const failed: string[] = []

    if (dest.groupIds) {
      const promises = dest.groupIds.map(async (id) => {
        const group = fastify.servers.getGroup(id)
        if (!group) {
          failed.push(id)
          return null
        }
        await group.performActionAll("request_stop", "builtin")
        success.push(id)
      })
      await Promise.allSettled(promises).catch(() => { })
    }
    if (dest.serverIds) {
      const promises = dest.serverIds.map(async (id) => {
        const server = fastify.servers.getServer(id)
        if (!server) {
          failed.push(id)
          return null
        }
        await server.performAction("request_stop", "builtin")
        success.push(id)
      })
      await Promise.allSettled(promises).catch(() => { })
    }

    return {
      success,
      failed
    }
  })

  fastify.get('/:shareId/addons', async (req: FastifyRequest<{ Params: { shareId?: string } }>, reply) => {
    if (!req.user!.hasPermission("shares.addons.view", req.params.shareId)) return NO_PERMISSION(reply)
    const shareId = req.params.shareId
    const share = fastify.servers.getShare(shareId)
    if (!share) {
      return reply.status(404).send({
        error: "Share Not Found",
        message: `No share with id "${shareId!.toLowerCase()}" could be found. Share may be unavailable, incorrecty configured or does not exist`
      })
    }
    return {
      addons: await share.getAddons(),
      shareInfo: share.export()
    }
  })

  fastify.get('/:shareId/addons/:filename', async (req: FastifyRequest<{ Params: { shareId: string, filename: string } }>, reply) => {
    // Filter out ../ or ..\
    const filename = req.params.filename.replace(/\.\.(\/|\\|$)+/, '')
    if (!filename) {
      return reply.status(401).send({
        error: "No filename provided",
        message: `Filename is blank`
      })
    }
    if (!req.user!.hasPermission("shares.addons.view", req.params.shareId, filename)) return NO_PERMISSION(reply)
    const shareId = req.params.shareId
    const share = fastify.servers.getShare(shareId)
    if (!share) {
      return reply.status(404).send({
        error: "Share Not Found",
        message: `No share with id "${shareId.toLowerCase()}" could be found. Share may be unavailable, incorrecty configured or does not exist`
      })
    }
    return {
      addonInfo: await share.getAddonInfo(filename)
      // TODO: need list of dests installed to?
    }
  })

  fastify.post('/:shareId/addons/upload', async (req: FastifyRequest<{ Params: { shareId: string } }>, reply) => {
    if (!req.user!.hasPermission("shares.addons.upload.direct", req.params.shareId)) return NO_PERMISSION(reply)
    const shareId = req.params.shareId
    const share = fastify.servers.getShare(shareId)
    if (!share) {
      return reply.status(404).send({
        error: "SHARE_NOT_FOUND",
        message: `No share with id "${shareId.toLowerCase()}" could be found. Share may be unavailable, incorrecty configured or does not exist`
      })
    } else if (!share.exts) {
      return reply.status(401).send({
        error: "SHARE_UPLOAD_EXT_MISSING",
        message: `Share does not have valid extensions setup, uploading is disabled`
      })
    }

    const parts = req.files()
    for await (const part of parts) {
      const ext = part.filename.split(".").pop()
      if (!ext || !share.exts.includes(ext)) {
        // TODO: Possibly req.user!.hasPermission check?
        return reply.status(400).send({
          error: "TYPE_NOT_ALLOWED",
          message: "The file type is not allowed for this share"
        })
      } else if (!VALID_FILENAME_REGEX.test(part.filename)) {
        return reply.status(400).send({
          error: "INVALID_FILENAME",
          message: `The filename must match the pattern /${VALID_FILENAME_REGEX.source}/`
        })
      }

      await pump(part.file, share.createUploadStream(part.filename))

      if (part.file.truncated) {
        console.warn(`${part.filename} is truncated, clearing downloaded piece`)
        await share.deleteAddon(part.filename)
        reply.send(new fastify.multipartErrors.FilesLimitError());
      }

      await req.user!.log(null, `uploaded addon %filename%`, {
        code: "shares.addons.upload.direct",
        metadata: {
          filename: part.filename
        }
      })
    }
    reply.send()
  })


  fastify.get('/:shareId/addons/:filename/download', async (req: FastifyRequest<{ Params: { shareId: string, filename: string } }>, reply) => {
    // Filter out ../ or ..\
    const filename = req.params.filename.replace(/\.\.(\/|\\|$)+/, '')
    if (!filename) {
      return reply.status(401).send({
        error: "No filename provided",
        message: `Filename is blank`
      })
    }

    const shareId = req.params.shareId
    const [code, granted] = req.user!.requirePermission("shares.addons.view", { resourceId: shareId })
    if (!granted) return NO_PERMISSION(reply)

    const share = fastify.servers.getShare(shareId)
    if (!share) {
      return reply.status(404).send({
        error: "Share Not Found",
        message: `No share with id "${shareId.toLowerCase()}" could be found. Share may be unavailable, incorrecty configured or does not exist`
      })
    }
    const addonInfo = await share.isInstalled(filename)
    if (!addonInfo) {
      return reply.status(404).send({
        error: "Addon Not Found",
        message: `No addon with filename "${filename} for share "${shareId.toLowerCase()}" could be found.`
      })
    }

    const stream = createReadStream(path.join(share.sourceFolder, filename))
    reply.header("Content-Disposition", "attachment; filename=" + filename)
    return reply.send(stream)
  })

  fastify.delete('/:shareId/addons/:filename', async (req: FastifyRequest<{ Params: { shareId: string, filename: string } }>, reply) => {
    // Filter out ../ or ..\
    const filename = req.params.filename.replace(/\.\.(\/|\\|$)+/, '')
    if (!filename) {
      return reply.status(401).send({
        error: "No filename provided",
        message: `Filename is blank`
      })
    }

    const shareId = req.params.shareId
    const [code, granted] = req.user!.requirePermission("shares.addons.delete", { resourceId: shareId })
    if (!granted) return NO_PERMISSION(reply)

    const share = fastify.servers.getShare(shareId)
    if (!share) {
      return reply.status(404).send({
        error: "Share Not Found",
        message: `No share with id "${shareId.toLowerCase()}" could be found. Share may be unavailable, incorrecty configured or does not exist`
      })
    }
    await share.deleteAddon(filename)
    await req.user!.log(null, `deleted addon %filename%`, {
      code,
      metadata: {
        filename
      }
    })
    return reply.status(204).send()
  })

  fastify.get(':/shareId/stream', { websocket: true}, async (ws, req: FastifyRequest<{ Params: { shareId: string }}>) => {
    const share = fastify.servers.getShare(req.params.shareId)
    if(!share) return ws.close(4004, "SHARE_NOT_FOUND")
    
    const unsub = share.workshopDLQueue.subscribe((event) => {
      ws.send(JSON.stringify(event))
    })

    ws.on("close", unsub)
    ws.on("error", unsub)
  })



  fastify.get('/:shareId/addons/workshop/:workshopId/download', async (req: FastifyRequest<{
    Params: { shareId: string, workshopId: string },
    Querystring: { 'destinations'?: string, force?: boolean, sse?: boolean, children: string[] }
  }>, reply) => {
    req.log.trace({ shareId: req.params.shareId, workshopId: req.params.workshopId, children: req.query.children }, "download request")
    let allowDownload = true
    const useSSE = req.query.sse
    function sendSSE(payload: any) {
      if (!useSSE) return
      return reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`)
    }
    async function send(payload: any, statusCode: number) {
      if (useSSE) return sendSSE(payload)
      else return await reply.status(statusCode).send(payload)
    }
    let keepAliveTimer
    if (useSSE) {
      reply.raw.writeHead(200, {
        'Cache-Control': 'no-cache,no-transform',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      reply.raw.flushHeaders()
      reply.raw.write('retry: 10000\n\n')
      // Send keep alive comments to prevent client from disconnecting
      keepAliveTimer = setInterval(() => {
        reply.raw.write(': keepalive\n\n')
      }, 1000 * 30)
    }
    if (!req.user!.hasPermission("shares.addons.upload.steam_workshop", req.params.shareId)) {
      await send({
        error: "No Permission",
        code: "NO_PERMISSION",
        message: `You do not have the ability to download addons from the steam workshop`
      }, 401)
    }
    const share = fastify.servers.getShare(req.params.shareId)
    if (!share) {
      const payload = {
        error: "Share Not Found",
        code: "SHARE_NOT_FOUND",
        message: `No share with id "${req.params.shareId.toLowerCase()}" could be found. Share may be unavailable, incorrecty configured or does not exist`
      }
      await send(payload, 404)
    } else if (!req.query.force && await share.isInstalled(`${req.params.workshopId}.vpk`)) {
      // This doesn't run when it is a collection, as collections themselves are not installed
      const addonInfo = (await share.getAddonInfo(`${req.params.workshopId}.vpk`)) as AddonInfo // we check isInstalled
      if (addonInfo.workshop) {
        const latestWs = await fastify.steam.getItemDetails([req.params.workshopId])
        if (latestWs[0].time_updated == addonInfo.lastModified) {
          // File is the same - ask for redownload
          allowDownload = false
        } else {
          sendSSE({
            code: 'NOTICE',
            message: `Addon is already installed but our version (${addonInfo.lastModified}) is out of date (${latestWs[0].time_updated}), updating...`
          })
          req.log.info({
            ourVersion: addonInfo.lastModified,
            wsVersion: latestWs[0].time_updated,
            ourVersionDate: new Date(addonInfo.lastModified ?? 0),
            wsVersionDate: new Date(latestWs[0].time_updated)
          }, "existing but outdated")
        }
      } else {
        // Ask for confirm to redownload if it's not a workshop item
        allowDownload = false
      }

      if (!allowDownload) {
        const payload = {
          code: 'FILE_EXISTS',
          error: "File exists",
          filename: addonInfo.filename,
          message: "The addon is already downloaded. " + (useSSE ? "Use Download to redownload" : "Provide ?force to force download.")
        }
        await send(payload, 409)
      }
    }
    if (allowDownload) {
      assert(share != undefined)
      try {
        sendSSE({ state: "FETCH_INFO", message: "Fetching information from steam" })
        const children = await fastify.steam.getCollectionChildren(req.params.workshopId)
        let details: (ChildWorkshopItem)[] = []
        const [parentItem] = await fastify.steam.getItemDetails([req.params.workshopId])
        if (!children) {
          details.push(parentItem)
        } else {
          details = await fastify.steam.getItemDetails(children)
          details
            .filter(detail => {
              // If query ?children provided and id is NOT in list, skip it:
              if (req.query.children && !req.query.children.includes(detail.publishedfileid)) return false
              // If there is data
              return detail.result === 1
            })
            .map(detail => {
              detail.collection = {
                id: parentItem.publishedfileid,
                name: parentItem.title
              }
              return detail
            })
        }

        if (details.length == 0) {
          const payload = {
            error: "No items to download",
            code: "NO_ITEMS",
            message: `No items were queued to download`
          }
          await send(payload, 400)
          return
        }


        const downloadPromises = details.map(detail => {
          return new Promise((resolve, reject) => {
            if (!detail || !detail.file_url) {
              sendSSE({
                state: "DOWNLOADING",
                error: true,
                entry: detail.publishedfileid,
                message: `Skipping ${detail.publishedfileid}: may not exist or is private</a>`
              })
              return reject(new Error(`No file_url for ${detail.publishedfileid}`))
            }

            sendSSE({
              state: "DOWNLOADING",
              entry: detail.publishedfileid,
              entryTitle: detail.title,
              currentBytes: 0,
              totalBytes: detail.file_size,
              progress: 0.0,
              message: `Downloading <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${detail.publishedfileid}"><b>${detail.title}</b></a>`
            })

            // await share.steamDownload(detail)
            const event = share.steamDownloadStream(detail)
            event.addListener("progress", (curBytes, totalBytes) => {
              sendSSE({
                state: "DOWNLOAD_PROGRESS",
                entry: detail.publishedfileid,
                currentBytes: curBytes,
                totalBytes: totalBytes,
                progress: curBytes / totalBytes
              })
            })
            event.addListener("finish", async () => {
              sendSSE({
                state: "DOWNLOADED",
                entry: detail.publishedfileid,
                currentBytes: detail.file_size,
                totalBytes: detail.file_size,
                message: `Downloaded <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${detail.publishedfileid}"><b>${detail.title}</b></a> (${humanFileSize(detail.file_size)})`
              })

              await req.user!.log(null, `downloaded workshop addon "%title%" (%filename%) for %share%`, {
                code: "shares.addons.upload.steam_workshop." + share!.id as UserPrivilegeCode,
                metadata: {
                  type: "workshop",
                  share: share!.id,
                  server: null,
                  filename: detail.publishedfileid + ".vpk",
                  title: detail.title,
                  size: detail.file_size,
                  url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${detail.publishedfileid}`
                }
              })

              resolve(true)
            })
          })
        })

        await Promise.allSettled(downloadPromises)


        sendSSE({ state: "INSTALLING", message: "Installing addons to specified destinations" })

        let destResults: undefined | Record<string, Record<string, { result: "success" | "error", error?: string }>> = undefined
        if (req.query.destinations) {
          destResults = {}
          const dests = req.query.destinations.split(",")
          for (const destKey of dests) {
            destResults[destKey] = {}
            for (const detail of details) {
              try {
                const filename = `${detail.publishedfileid}.vpk`
                await share!.enable(filename, destKey)
                destResults[destKey][detail.publishedfileid] = {
                  result: "success"
                }
                await req.user!.log(null, `enabled addon {filename} for "{share}/{server}"`, {
                  code: "shares.addons.edit." + share!.id + "." + destKey as UserPrivilegeCode,
                  metadata: {
                    share: share!.id,
                    server: destKey,
                    filename: filename
                  }
                })
              } catch (err) {
                sendSSE({ state: "INSTALLING", message: `${err.code}: Failed to install ${detail.publishedfileid} for ${destKey}`, error: true })
                console.warn(`[ShareInstaller] Install failed for ${destKey}/${detail.publishedfileid}: `, err)
                destResults[destKey][detail.publishedfileid] = {
                  result: "error",
                  error: err.message
                }
              }

            }
          }
        }

        if (!useSSE) {
          return {
            results: destResults
          }
        }
      } catch (error) {
        req.log.error({
          params: req.params,
          share: share.id
        }, "Steam Error: " + error.stack)
        const payload = {
          code: 'STEAM_ERROR',
          error: error.message,
          message: "An error occurred while fetching info or downloading the addon",
        }
        await send(payload, 500)
      }
    }
    if (useSSE) {
      reply.raw.write(`data: {"state": "COMPLETE"}\n\n`)
      // Let the client terminate the connection:
      reply.hijack()
      // Timeout if they haven't killed it
      const timeout = setTimeout(() => reply.raw.end(), 60000)
      reply.raw.on("close", () => {
        clearInterval(keepAliveTimer)
        clearTimeout(timeout)
      })
    }
  })

  fastify.post('/:shareId/addons/:filename/:operation/:destKey', async (req: FastifyRequest<{ Params: { shareId: string, operation: string, filename: string, destKey: string } }>, reply) => {
    // Filter out ../ or ..\
    const filename = req.params.filename.replace(/\.\.(\/|\\|$)+/, '')
    if (!filename) {
      return reply.status(401).send({
        error: "No filename provided",
        message: `Filename is blank`
      })
    }
    const isInstall = req.params.operation === "install" || req.params.operation === "enable"
    if (!isInstall && req.params.operation !== "uninstall" && req.params.operation !== "disable") {
      return reply.status(400).send({
        error: "INVALID_OPERATION",
        message: `Operation must be of 'enable' or 'disable', not ${req.params.operation}`
      })
    }

    const shareId = req.params.shareId
    const [code, granted] = req.user!.requirePermission("shares.addons.edit", { resourceId: shareId })
    if (!granted) return NO_PERMISSION(reply)

    const share = fastify.servers.getShare(shareId)
    if (!share) {
      return reply.status(404).send({
        error: "SHARE_NOT_FOUND",
        message: `No share with id "${shareId.toLowerCase()}" could be found. Share may be unavailable, incorrecty configured or does not exist`
      })
    } else if (!share.destinations[req.params.destKey]) {
      return reply.status(404).send({
        error: "SHARE_DEST_NOT_FOUND",
        message: `Share does not have a destination of id "${req.params.destKey}".`
      })
    }
    // Verify that the filename exists in the src:
    const addonInfo = await share.isInstalled(filename)
    if(!addonInfo) {
      return reply.status(404).send({
        error: "File not found",
        message: `Share does not have a downloaded filename "${filename}".`
      })
    }
    
    try {
      if (isInstall)
        await share.enable(filename, req.params.destKey)
      else
        await share.disable(filename, req.params.destKey)
      await req.user!.log(null, `${isInstall ? 'enabled' : 'disabled'} addon %filename% for %share%/%server%`, {
        code,
        metadata: {
          share: share.id,
          server: req.params.destKey,
          filename
        }
      })
      return reply.status(204).send()
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({
        error: isInstall ? "ENABLE_ERROR" : "DISABLE_ERROR",
        message: `Error occurred while ${isInstall ? 'enabling' : 'disabling'} addon`
      })
    }
    
  })
}

function humanFileSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
}
