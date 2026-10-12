import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import FastifyMultipart from '@fastify/multipart'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { AddonCollectionInfo, AddonInfo, ChildWorkshopItem, DetailsResponse, DownloadEvent, WebsocketMessage, WebsocketRequest, WorkshopItem } from '@srcpanel/common/Share';
import { NO_PERMISSION, NOT_FOUND } from '../../responses.js';
import { UserPrivilegeCode } from '@srcpanel/common/Privileges';
import { createReadStream } from 'fs';
import path from 'path';
import assert from 'assert';
import { log } from 'console';
import Share from '../../modules/shares/Share.js';
import { RequirePermissionOptions } from '../../modules/users/User.js';
import { requirePermission } from '../../guards/auth.js';
const pump = promisify(pipeline)

const VALID_FILENAME_REGEX = new RegExp(/[a-z0-9_\- .]+/i)
const UPLOAD_MAX_FILESIZE_BYTES = 1000 * 1000 * 1000 * 5 // 5 GB

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.decorateRequest('filename', '')
  fastify.decorateRequest('share', null)
  fastify.decorateRequest('shareDest', '')
  fastify.decorateRequest('permCode', '')

  // For direct upload
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

  fastify.post('/:shareId/addons/workshop/:publishedfileid', 
    async (req: FastifyRequest<{ 
      Params: { shareId: string, publishedfileid: string },
      Querystring: { destinations: string, children?: string }
    }>, reply) => {
      const share = fastify.servers.getShare(req.params.shareId)
      if(!share) return NOT_FOUND(reply, "SHARE_NOT_FOUND", "No share found with id")
      if(!share.sources.steam_workshop) return reply.send({
        error: "SOURCE_UNSUPPORTED",
        message: "Steam workshop support is not enabled for this share"
      })

      const destinations: string[]|undefined = req.query.destinations && req.query.destinations != "" 
        ? req.query.destinations.split(",")
        : undefined
      
      // Check if the item is a collection and either resolve the children or download them all
      const children = await fastify.steam.getCollectionChildren(req.params.publishedfileid)
      const details = await fastify.steam.getItemDetails([req.params.publishedfileid])

      if(details.length === 0) return reply.status(404).send({
        error: "ITEM_NOT_FOUND",
        message: "No item found in workshop"
      })

      req.log.debug({ shareId: req.params.shareId, destinations, isCollection: children != null }, "download requested")

      if(children != null) {
        // If a collection - download only children
        const selectedChildrenIds = req.query.children?.split(",")
        req.log.trace({}, "getting child details")
        const childrenItems = (await fastify.steam.getItemDetails(children))
          // Filter out unselected children addons
          .filter(child => !selectedChildrenIds || selectedChildrenIds.includes(child.publishedfileid))
          // Convert it to ChildWorkshopItem to keep track of collection its in
          .map<ChildWorkshopItem>(item => {
            return {
              collection: {
                id: req.params.publishedfileid,
                name: details[0].title
              },
              ...item
            }
          })
        req.log.trace({}, "adding child details to queue")
        share.workshopDLQueue.downloadItems(childrenItems, destinations)
        req.log.debug({ shareId: req.params.shareId, children }, "adding collection children")
      } else {
        // Not a collection - download item
        share.workshopDLQueue.downloadItems(details, destinations)
      }

      return reply.status(204).send()
    }
  )

  fastify.post('/:shareId/restart-servers', async (req: FastifyRequest<{ Params: { shareId: string, destId: string } }>, reply) => {
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
    try {
      return {
        addons: await share.getAddons(),
        shareInfo: share.export()
      } 
    } catch(err) {
      req.log.error({ shareId: req.params.shareId}, "getAddons:"  + err.stack)
      return reply.status(500).send({
        error: "DB_ERROR",
        message: "Failed to get list of addons"
      })
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

  fastify.get('/event-stream', { websocket: true}, async (ws, req: FastifyRequest<{ Params: { shareId: string }}>) => {
    function send(event: WebsocketMessage) {
      if (ws.readyState !== ws.OPEN) return
      try { ws.send(JSON.stringify(event)) }
      catch (err) { req.log.warn({ err }, 'ws send failed') }
      ws.send(JSON.stringify(event))
    }

    function onMsg(msg: WebsocketRequest) {
      if(msg.subscribe) {
        const share = fastify.servers.getShare(msg.subscribe)
        if(!share) return send({ type: "error", error: "INVALID_SHARE_ID"})

        const unsub = share.subscribe((msg) => send(msg))
        ws.on("close", unsub)
        ws.on("error", unsub)

        send({ type: "ok" })
      }
    }

    const pingTimer = setInterval(() => {
      ws.ping()
    }, 25_000)

    ws.on('message', message => {
      try {
        const json = JSON.parse(message.toString())
        onMsg(json)
      } catch(err) {
        req.log.warn("invalid message: " + err)
      }
    })

    ws.on("close", () => {
      clearInterval(pingTimer)
    })
  })

  fastify.post(
    '/:shareId/addons/:filename/check', 
    { preHandler: [ requireShare(), requireFilename() ]},
    async (req: FastifyRequest<{ Params: { shareId: string, filename: string } }>, reply) => {
      const share = req.getDecorator<Share>("share")
      const filename = req.getDecorator<string>("filename")

      await share.scanner.checkAddon(filename)
      return await reply.send(204)
    }
  )

  fastify.post(
    '/:shareId/addons/:filename/:operation/:destKey', 
    { preHandler: [ 
        requirePermission("shares.addons.edit", (req) => ({ resourceId: (req.params as any).shareId})), 
        requireShare(true), 
        requireFilename()
      ]
    },
    async (
      req: FastifyRequest<{ Params: { shareId: string, operation: string, filename: string, destKey: string } }>, 
      reply
    ) => {
      const share = req.getDecorator<Share>("share")
      const filename = req.getDecorator<string>("filename")
      const code = req.getDecorator<UserPrivilegeCode>("permCode")
      
      const isInstall = req.params.operation === "install" || req.params.operation === "enable"
      if (!isInstall && req.params.operation !== "uninstall" && req.params.operation !== "disable") {
        return reply.status(400).send({
          error: "INVALID_OPERATION",
          message: `Operation must be of 'enable' or 'disable', not ${req.params.operation}`
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
    }
  )
}

/**
 * Check for a valid filename
 * @returns decorator 'filename'
 */
function requireFilename(): preHandlerAsyncHookHandler {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    let { filename } = req.params as { filename: string }
    filename = filename
      .replace(/\.\.(\/|\\|$)+/, '')
      .trim()
    if (!filename) {
      return reply.status(401).send({ error: 'No filename provided', message: 'Filename is blank' })
    }
    req.setDecorator("filename", filename)
  }
}

/**
 * Require a valid share
 * @param requireDest if true, require a valid destKey
 * @returns decorator 'share' and optionally 'shareDest'
 */
function requireShare(requireDest = false): preHandlerAsyncHookHandler {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const { shareId, destKey } = req.params as { shareId: string, destKey: string }
    const share = req.server.servers.getShare(shareId)
    if(!share) {
      return reply.status(404).send({
        error: "Share Not Found",
        message: `No share with id "${shareId.toLowerCase()}" could be found. Share may be unavailable, incorrecty configured or does not exist`
      })
    }
    req.setDecorator("share", share)

    if(requireDest) {
      if (!destKey || !share.destinations[destKey]) {
        return reply.status(404).send({
          error: "SHARE_DEST_NOT_FOUND",
          message: `Share does not have a destination of id "${destKey}".`
        })
      }
      req.setDecorator("shareDest", destKey)
    }
  }
}