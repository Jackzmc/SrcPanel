import { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify"
import Share from "../modules/shares/Share.js"
import { sendMissingParamError } from "./index.js"

export const GUARD_REQUIRE_FILENAME = {
  register(fastify: FastifyInstance) {
    fastify.decorateRequest("filename", "")
  },
  prehandler(): preHandlerAsyncHookHandler {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      let { filename } = req.params as { filename: string }
      filename = filename
        .replace(/\.\.(\/|\\|$)+/, '')
        .trim()
      if (!filename) {
        return reply.status(400).send({ error: 'PARAM_MISSING_FILENAME', message: "Missing parameter 'filename'" })
      }
      req.setDecorator("filename", filename)
    }
  },
  get: (req: FastifyRequest) => req.getDecorator<string>("filename") 
}

export const GUARD_REQUIRE_SHARE = {
  register(fastify: FastifyInstance) {
    fastify.decorateRequest("share", null)
    fastify.decorateRequest("shareDest", "")
  },
  /**
   * Require a valid share
   * @param requireDest if true, require a valid destKey
   * @returns decorator 'share' and optionally 'shareDest'
  */
  prehandler(requireDest = false): preHandlerAsyncHookHandler {
    return async (req: FastifyRequest, reply: FastifyReply) => {
        const { shareId, destKey } = req.params as { shareId: string, destKey: string }
        if(!shareId) return sendMissingParamError(reply, "shareId")
        if(requireDest && !destKey) return sendMissingParamError(reply, "destKey")

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