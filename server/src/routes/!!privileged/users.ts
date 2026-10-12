import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import SteamID from 'steamid';
import { APIListPlayersResponse, APIUserDetails, PlayerRecentEntry, UserNameEntry, UserProfileData } from '@srcpanel/common/User';
import { NOT_FOUND, NO_PERMISSION } from '../../responses.js';
import { ADMINS_DB, TABLE_PREFIX } from '../../middlewares/managers.js';
import { GUARD_REQUIRE_PLAYER } from '../../guards/users.js';
import PlayerManager from '../../modules/users/PlayerManager.js';


const RECENT_DEFAULT_LIMIT = 25

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.get(
    '/recent/:server?', 
    async (
      req: FastifyRequest<{ Params: { server?: string }, Querystring: { limit?: number, page?: string } }>, 
      reply
    ): Promise<APIListPlayersResponse<PlayerRecentEntry>> => {
      let limit = Number(req.query.limit) || RECENT_DEFAULT_LIMIT
      if (limit < 0 || limit > 100) limit = RECENT_DEFAULT_LIMIT

      let page = req.query.page && parseInt(req.query.page) || 1

      const recentResults = await PlayerManager.instance.getRecent({ 
        server: req.params.server,
        ignoreSteamID: req.user?.steamid2,
      }, page, limit)

      const recentEntries: APIListPlayersResponse<PlayerRecentEntry>['users'] = recentResults.map(entry => {
        return {
          ...entry.player.cachedEntry!,
          server: entry.server
        }
      })

      return {
        users: recentEntries
      }
    }
  )


  fastify.get(
    '/search/:query?', 
    async (
      req: FastifyRequest<{ Params: { query?: string }, Querystring: { query?: string } }>, 
      reply
    ): Promise<APIListPlayersResponse> => {
      const query = req.params.query || req.query.query
      if (!query) return reply.status(400).send({ error: 'MISISNG_PARAM', message: "Query (route OR query) parameter missing" })

      const players = await PlayerManager.instance.findPlayers(query, 10)

      return {
        users: players
          .filter(player => player.cachedEntry) // findPlayers populates no need to fetch
          .map(player => player.cachedEntry!)
      }
    }
  )

  fastify.post('/:steamid/update', async (req: FastifyRequest<{ Params: { steamid: string } }>, reply) => {
    if (!req.params.steamid || req.params.steamid.length < 10) {
      return reply.status(400).send({
        error: "INVALID_STEAMID",
        message: "Provided steamid is invalid"
      })
    }

    const user = await fastify.users.fetchUser(new SteamID(req.params.steamid), true)
    return {
      user
    }
  })

  fastify.get('/:steamid/profile', async (req: FastifyRequest<{ Params: { steamid: string } }>, reply): Promise<UserProfileData> => {
    const profile = await fastify.authmngr.getProfileData(req.params.steamid)
    if (!profile) return NOT_FOUND(reply, "User has no profile data")
    reply.header("cache-control", "max-age 86400,stale-while-revalidate 0")
    return profile
  })

  fastify.get('/:steamid/names', async (req: FastifyRequest<{ Params: { steamid: string } }>, reply): Promise<UserNameEntry[]> => {
    const names = await fastify.users.getUserNameHistory(req.params.steamid)
    return names
  })

  fastify.post('/:steamid/profile', async (req: FastifyRequest<{ Params: { steamid: string }, Body: UserProfileData }>, reply): Promise<UserProfileData> => {
    if (req.params.steamid !== req.user!.steamid2) {
      return NO_PERMISSION(reply, "You can only edit your own profile")
    }
    await fastify.db.query(`
      INSERT INTO \`${ADMINS_DB}\`.panel_user_data (steamid, birth_date, birth_month) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE birth_date = ?, birth_month = ?`,
      [req.user!.steamid2, req.body.birthDate, req.body.birthMonth, req.body.birthDate, req.body.birthMonth]
    )
    
    return reply.status(204).send()
  })

  fastify.get(
    '/:steamid', 
    { preHandler: [ GUARD_REQUIRE_PLAYER.prehandler() ]},
    async (
      req: FastifyRequest<{ Params: { steamid: string }, Querystring: { include?: string }}>, 
      reply
    ): Promise<APIUserDetails> => {
      const player = GUARD_REQUIRE_PLAYER.getPlayer(req)
      const includes = req.query.include ? req.query.include.split(',') : []
      const userStart = Date.now()

      const playerEntry = await player.getEntry()
      if (!playerEntry) {
        return reply.status(404).send({
          error: "NO_USER_FOUND",
          message: "Steamid did not match any users."
        })
      }

      const result: APIUserDetails = {
        meta: {
          includes: {
            profile: false,
            admin: false,
            names: false,
          },
          times: {
            user: Date.now() - userStart
          }
        },
        user: playerEntry
      }

      if (includes.includes("admin")) {
        result.admin = fastify.authmngr.getAdminExport(req.params.steamid)
        result.meta.includes.admin = true
      }
      if (includes.includes("profile")) {
        const profile = await fastify.authmngr.getProfileData(req.params.steamid)
        result.profile = profile
        result.meta.includes.profile = true
      }
      if (includes.includes("names")) {
        const names = await fastify.users.getUserNameHistory(req.params.steamid)
        result.names = names
        result.meta.includes.names = true
      }

      reply.header("cache-control", "max-age 86400,stale-while-revalidate 0")

      return result
    }
  )

  fastify.route({
    method: 'GET',
    url: '/:steamid/bans',
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            bans: { type: 'array', default: [] },
          }
        }
      }
    },
    preHandler: [ GUARD_REQUIRE_PLAYER.prehandler() ],
    async handler(req: FastifyRequest<{ Params: { steamid: string } }>, reply) {
      const player = GUARD_REQUIRE_PLAYER.getPlayer(req)
      const bans = await player.getBans()

      return {
        bans,
      }
    }
  })

}
