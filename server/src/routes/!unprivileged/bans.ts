import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { APIBanFlags, APIBanResponse, type ListAPIBan } from '@srcpanel/common/Ban';
import { NOT_FOUND } from '../../util/responses.js';
import { CreateBanAppealQuerySchema, type APICreateAppealQuery } from '@srcpanel/common/bans/schemas';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.get('/', async (req: FastifyRequest<{ Querystring: { limit?: number, page?: number, include: string } }>, reply): Promise<APIBanResponse> => {
    const authorized = await fastify.authmngr.isAuthorized(req)

    let page = Number(req.query.page)
    if (!page || page < 0) page = 1

    let limit = Number(req.query.limit)
    if (!limit || limit < 1) limit = 100

    const offset = (page - 1) * limit;

    const bans = await fastify.managers.bans.getBans({
      limit,
      offset,
      expiredOnly: req.query.include !== 'expired'
    })


    return {
      totalBans: bans.length,
      bans: bans.map(row => {
        if(!authorized) delete row.reason
        return row as ListAPIBan
      })
    }
  })

  // TODO: we probably need to add some sort of limitation to this
  fastify.post(
    '/:id/appeal',
    { schema: { querystring: CreateBanAppealQuerySchema }}, 
    async (req: FastifyRequest<{ Params: { id: number }, Querystring: APICreateAppealQuery }>, reply) => {
    const ban = await fastify.managers.bans.getBan(req.params.id)
    if (!ban) {
      return NOT_FOUND(reply, "Ban")
    }
    if (ban.flags & APIBanFlags.Suspended) {
      return reply.status(409).send({
        error: "BAN_SUSPENDED",
        message: "The specified ban is suspended/in-active"
      })
    } else if (ban.flags & APIBanFlags.AppealBanned) {
      return reply.status(403).send({
        error: "APPEAL_DENIED",
        message: "This ban cannot be appealed"
      })
    }

    const appeals = await fastify.managers.bans.getAppeals(ban.id)
    if (appeals.length > 0) {
      return reply.status(409).send({
        error: "APPEAL_EXISTS",
        message: "There is already pending appeal for this ban"
      })
    }

    const id = await fastify.managers.bans.insertBanAppeal(ban.id, req.query.message, req.ip)

    return {
      appealId: id
    }
  })
}
