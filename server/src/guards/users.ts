import { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify"
import { sendMissingParamError } from "./index.js"
import SteamID from "steamid"

export const GUARD_REQUIRE_STEAMID = {
  register(fastify: FastifyInstance) {
    fastify.decorateRequest("steamid", null)
  },
  prehandler(): preHandlerAsyncHookHandler {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      let { steamid } = req.params as { steamid: string }
      if(!steamid || !steamid.startsWith("STEAM_")) {
        return sendMissingParamError(reply, "steamid")
      } else if(steamid.length < 10) {
        return reply.status(400).send({ error: "INVALID_STEAMID", message: "SteamID is not valid" })
      }
      const id = SteamID.fromIndividualAccountID(steamid.substring(11))
      if(id.accountid === 0) {
        return reply.status(400).send({ error: "INVALID_STEAMID", message: "SteamID is not valid" })
      }
      req.setDecorator("steamid", id)
    }
  },
  get: (req: FastifyRequest) => req.getDecorator<SteamID>("steamid") 
}