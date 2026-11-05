import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify"
import { sendInvalidParamError, sendMissingParamError } from "./responses.js"
import type Discussion from "@srcpanel/common/discussions/Discussion"
import { NOT_FOUND } from "../util/responses.js"

export const GUARD_REQUIRE_DISCUSSION = {
  register(fastify: FastifyInstance) {
    fastify.decorateRequest("discussionId", "")
    fastify.decorateRequest("discussion", null)
  },
  prehandler(): preHandlerAsyncHookHandler {
    return async (req: FastifyRequest, reply: FastifyReply) => {
        let { id } = req.params as { id: string }
        if (!id) {
          return sendMissingParamError(reply, "id", "missing discussion id parameter")
        }
        const discussId = parseInt(id)
        if(isNaN(discussId)) {
          return sendInvalidParamError(reply, "id")
        }
        const discuss = await req.server.managers.discussions.get(discussId)
        if(!discuss) return NOT_FOUND(reply, "DISCUSS")
        req.setDecorator("discussionId", discussId)
        req.setDecorator("discussion", discuss)
    }
  },
  getId: (req: FastifyRequest) => req.getDecorator<string>("discussionId"),
  get: (req: FastifyRequest) => req.getDecorator<Discussion>("discussion") 
}