import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import FastifyMultipart from '@fastify/multipart'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { ChildWorkshopItem, DetailsResponse, WebsocketMessage, WebsocketRequest, WorkshopItem } from '@srcpanel/common/Share';
import { NO_PERMISSION } from '../../responses.js';
import { UserPrivilegeCode } from '@srcpanel/common/Privileges';
import { createReadStream } from 'fs';
import path from 'path';
import Share from '../../modules/shares/Share.js';
import { GUARD_REQUIRE_PERMISSION } from '../../guards/auth.js';
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


  fastify.get(
    '/workshop/:publishedfileid/details', 
    { preHandler: [
      // require addon permission to just prevent using our API as proxy
      GUARD_REQUIRE_PERMISSION.prehandler("shares.addons.view", (req) => ({ resourceId: (req.params as any).shareId})), 
      requireShare()
    ]},
    async (req: FastifyRequest<{ Params: { publishedfileid: string } }>, reply): Promise<DetailsResponse> => {
      const results = await fastify.steam.getItemDetails([req.params.publishedfileid])
      if (results.length == 0) return { type: "none", item: null }
      // check if collection
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
    }
  )

  fastify.get('/workshop/search/:appid', async (req: FastifyRequest<{ Params: { appid: string }, Querystring: { query: string } }>, reply): Promise<{ results: WorkshopItem[] }> => {
    if (!req.user!.hasPermission("shares.addons.view")) return NO_PERMISSION(reply)
    const results = await fastify.steam.searchItems(req.query.query, req.params.appid)
    return {
      results: results
    }
  })


  fastify.get(
    '/', 
    { preHandler: [
      GUARD_REQUIRE_PERMISSION.prehandler("shares.view", (req) => ({ resourceId: (req.params as any).shareId})), 
    ]},
    async (req: FastifyRequest, reply) => {
      return fastify.servers.shares
    }
  )

  fastify.get(
    '/:shareId', 
    { preHandler: [
      GUARD_REQUIRE_PERMISSION.prehandler("shares.view", (req) => ({ resourceId: (req.params as any).shareId})), 
      requireShare()
    ]},
    async (req: FastifyRequest<{ Params: { shareId?: string } }>, reply) => {
      const share = req.getDecorator<Share>("share")
      return {
        share: share.export()
      }
    }
  )

  fastify.post(
    '/:shareId/addons/workshop/:publishedfileid', 
    { preHandler: [
      GUARD_REQUIRE_PERMISSION.prehandler("shares.addons.upload.steam_workshop", (req) => ({ resourceId: (req.params as any).shareId})), 
      requireShare()
    ]},
    async (req: FastifyRequest<{ 
      Params: { shareId: string, publishedfileid: string },
      Querystring: { destinations: string, children?: string }
    }>, reply) => {
      const share = req.getDecorator<Share>("share")
      const code = GUARD_REQUIRE_PERMISSION.get(req)
      // const code = req.getDecorator<UserPrivilegeCode>("permCode")
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

      req.user?.log(null, "started steam workshop download for %filename%", {
        code,
        metadata: {
          filename: req.params.publishedfileid
        }
      })

      return reply.status(204).send()
    }
  )

  fastify.post(
    '/:shareId/restart-servers',
    { preHandler: [
      GUARD_REQUIRE_PERMISSION.prehandler("shares.manage", (req) => ({ resourceId: (req.params as any).shareId})), 
      requireShare()
    ]},
    async (req: FastifyRequest<{ Params: { shareId: string, destId: string } }>, reply) => {
      const share = req.getDecorator<Share>("share")
      const destKey = req.getDecorator<string>("shareDest")

      const dest = share.destinations[destKey]

      if(!dest.restartTargets) {
        return reply.send({})
      }

      return await fastify.servers.performActionBulk(dest.restartTargets, "request_stop", "builtin", req.user)
    }
  )

  fastify.get(
    '/:shareId/addons', 
    { preHandler: [
      GUARD_REQUIRE_PERMISSION.prehandler("shares.addons.view", (req) => ({ resourceId: (req.params as any).shareId})), 
      requireShare(false)
    ]},
    async (req: FastifyRequest<{ Params: { shareId?: string } }>, reply) => {
      const share = req.getDecorator<Share>("share")

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
    }
  )

  fastify.get(
    '/:shareId/addons/:filename', 
    { preHandler: [
      GUARD_REQUIRE_PERMISSION.prehandler("shares.addons.view", (req) => ({ resourceId: (req.params as any).shareId})), 
      requireFilename(),
      requireShare(false),
    ]},
    async (req: FastifyRequest<{ Params: { shareId: string, filename: string } }>, reply) => {
      const filename = req.getDecorator<string>("filename")
      const share = req.getDecorator<Share>("share")

      return {
        addonInfo: await share.getAddonInfo(filename)
      }
    }
  )

  fastify.post(
    '/:shareId/addons/upload', 
    { preHandler: [
      GUARD_REQUIRE_PERMISSION.prehandler("shares.addons.upload.direct", (req) => ({ resourceId: (req.params as any).shareId})), 
      requireShare(false)
    ]},
    async (req: FastifyRequest<{ Params: { shareId: string } }>, reply) => {
      const share = req.getDecorator<Share>("share")
      const code = GUARD_REQUIRE_PERMISSION.get(req)

      if (!share.exts) {
        return reply.status(401).send({
          error: "SHARE_UPLOAD_UNSUPPORTED",
          message: `Share does not have valid extensions setup, uploading is disabled`
        })
      }

      const parts = req.files()
      for await (const part of parts) {
        const ext = part.filename.split(".").pop()
        if (!ext || !share.exts.includes(ext)) {
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
          req.log.warn({ filename: part.filename }, `file truncated, clearing downloaded piece`)
          await share.deleteAddon(part.filename)
          reply.send(new fastify.multipartErrors.FilesLimitError());
        }

        await req.user!.log(null, `uploaded addon %filename%`, {
          code,
          metadata: {
            filename: part.filename
          }
        })
      }
      reply.send()
    }
  )


  fastify.get(
    '/:shareId/addons/:filename/download', 
    { preHandler: [
      GUARD_REQUIRE_PERMISSION.prehandler("shares.addons.view", (req) => ({ resourceId: (req.params as any).shareId})), 
      requireFilename(),
      requireShare(false)
    ]},
    async (req: FastifyRequest<{ Params: { shareId: string, filename: string } }>, reply) => {
      const filename = req.getDecorator<string>("filename")
      const share = req.getDecorator<Share>("share")

      const addonInfo = await share.isInstalled(filename)
      if (!addonInfo) {
        return reply.status(404).send({
          error: "Addon Not Found",
          message: `No addon with filename "${filename} for share "${share.id.toLowerCase()}" could be found.`
        })
      }

      const stream = createReadStream(path.join(share.sourceFolder, filename))
      reply.header("Content-Disposition", "attachment; filename=" + filename)
      return reply.send(stream)
    }
  )

  fastify.delete(
    '/:shareId/addons/:filename', 
    { preHandler: [ 
        GUARD_REQUIRE_PERMISSION.prehandler("shares.addons.delete", (req) => ({ resourceId: (req.params as any).shareId})), 
        requireShare(), 
        requireFilename()
      ]
    },
    async (req: FastifyRequest<{ Params: { shareId: string, filename: string } }>, reply) => {
      const filename = req.getDecorator<string>("filename")
      const share = req.getDecorator<Share>("share")
      const code = GUARD_REQUIRE_PERMISSION.get(req)

      await share.deleteAddon(filename)
      await req.user!.log(null, `deleted addon %filename%`, {
        code,
        metadata: {
          filename
        }
      })
      return reply.status(204).send()
    }
  )

  fastify.get(
    '/event-stream', 
    { websocket: true },
    async (ws, req: FastifyRequest<{ Params: { shareId: string }}>) => {
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
          if(req.user?.requirePermission("shares.view", { resourceId: share.id })) {
            const unsub = share.subscribe((msg) => send(msg))
            ws.on("close", unsub)
            ws.on("error", unsub)
            
            send({ type: "ok" })
          } else {
            send({ type: "error", error: "NO_PERMISSION", message: "no permission" })
          }
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
    }
  )

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
        GUARD_REQUIRE_PERMISSION.prehandler("shares.addons.edit", (req) => ({ resourceId: (req.params as any).shareId})), 
        GUARD_REQUIRE_SHARE.prehandler(true), 
        GUARD_REQUIRE_FILENAME.prehandler()
      ]
    },
    async (
      req: FastifyRequest<{ Params: { shareId: string, operation: string, filename: string, destKey: string } }>, 
      reply
    ) => {
      const share = GUARD_REQUIRE_SHARE.getShare(req)
      const filename = GUARD_REQUIRE_FILENAME.get(req)
      const code = GUARD_REQUIRE_PERMISSION.get(req)
      
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
 * @deprecated
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
 * @deprecated
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

const GUARD_REQUIRE_FILENAME = {
  prehandler(): preHandlerAsyncHookHandler {
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
  },
  get: (req: FastifyRequest) => req.getDecorator<string>("filename") 
}

const GUARD_REQUIRE_SHARE = {
  /**
   * Require a valid share
   * @param requireDest if true, require a valid destKey
   * @returns decorator 'share' and optionally 'shareDest'
  */
  prehandler(requireDest = false): preHandlerAsyncHookHandler {
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
  },
  getShare: (req: FastifyRequest) => req.getDecorator<Share>("share"),
  getShareDest: (req: FastifyRequest) => req.getDecorator<string>("shareDest"),
}