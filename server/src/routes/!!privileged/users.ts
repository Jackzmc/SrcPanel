import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import SteamID from 'steamid';
import { BanAppeal, FullAPIBan } from '@srcpanel/common/Ban';
import { NAME_INVALID_CHAR_REPLACE } from '../../routes/!unprivileged/bans.js';
import { APIListPlayersResponse, APIUserDetails, PlayerEntry, PlayerRecentEntry, ReadableAdminData, UserNameEntry, UserProfileData } from '@srcpanel/common/User';
import { NOT_FOUND, NO_PERMISSION } from '../../responses.js';
import { ADMINS_DB, TABLE_PREFIX } from '../../middlewares/managers.js';
import { GUARD_REQUIRE_STEAMID } from '../../guards/users.js';
import PlayerManager from '../../modules/users/PlayerManager.js';


const RECENT_DEFAULT_LIMIT = 25
const STEAM_ID_REGEX = new RegExp(/STEAM_\d:\d:\d+/)

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.get('/recent/:server?', async (req: FastifyRequest<{ Params: { server?: string }, Querystring: { limit?: number, offset?: string } }>, reply): Promise<APIListPlayersResponse<PlayerRecentEntry>> => {
    let limit = Number(req.query.limit) || RECENT_DEFAULT_LIMIT
    if (limit < 0 || limit > 100) limit = RECENT_DEFAULT_LIMIT

    let offset = req.query.offset ? (parseInt(req.query.offset) ?? 0) : 0
    if (offset <= 0) offset = 0

    let server = req.params.server || null
    if (server === "all") server = null
    const start = Date.now()
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT
        client as steamid,
        u.last_name as name, u.last_country as country, u.create_time as firstJoinDate, u.last_join_time as lastJoinDate,
        server,
        (SELECT COUNT(*) FROM notes WHERE notes.steamid = client) as notesCount,
        (SELECT COUNT(*) FROM bans WHERE bans.steamid = client) as bansCount,
        (SELECT COUNT(*) FROM \`${ADMINS_DB}\`.sm_admins
            WHERE SUBSTRING(\`${ADMINS_DB}\`.sm_admins.identity,11) = SUBSTRING(client, 11)
            LIMIT 1
        ) as isAdmin
      FROM activity_log l
      LEFT JOIN view_${TABLE_PREFIX}_user u ON SUBSTRING(client, 11) = u.account_id
      WHERE
          timestamp >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY))
          AND TYPE = 'JOIN'
          AND server = IFNULL(?,server) 
          AND client != ? AND ISNULL(target)
      ORDER BY l.timestamp DESC
      LIMIT ?,?`,
      [server, req.session.user.steamid, offset, limit]
    )

    const steamids: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      // Filter out steamids with newest being kept
      if (steamids.includes(row.steamid)) {
        rows.splice(i, 1)
        continue
      }
      steamids.push(row.steamid)

      row.steamid2 = row.id
      row.isAdmin = row.isAdmin === 1
    }

    return {
      meta: {
        queryTimeSec: Date.now() - start,
        nextOffset: offset + rows.length
      },
      users: rows as APIListPlayersResponse<PlayerRecentEntry>['users']
    }
  })


  fastify.get(
    '/search/:query?', 
    async (
      req: FastifyRequest<{ Params: { query?: string }, Querystring: { query?: string } }>, 
      reply
    ): Promise<APIListPlayersResponse> => {
      const query = req.params.query || req.query.query
      if (!query) return reply.status(400).send({ error: 'MISISNG_PARAM', message: "Query (route OR query) parameter missing" })

      const start = Date.now()
      const players = await PlayerManager.instance.findPlayers(query, 10)

      return {
        meta: {
          queryTimeSec: Date.now() - start,
        },
        users: players.map(player => player.entry)
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
    { preHandler: [ GUARD_REQUIRE_STEAMID.prehandler() ]},
    async (
      req: FastifyRequest<{ Params: { steamid: string }, Querystring: { include?: string }}>, 
      reply
    ): Promise<APIUserDetails> => {
      const steamid = GUARD_REQUIRE_STEAMID.get(req)

      const includes = req.query.include ? req.query.include.split(',') : []

      const userStart = Date.now()
      const player = await PlayerManager.instance.find(steamid)
      if (!player) {
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
        user: player.entry
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
            meta: { type: 'object' },
            bans: { type: 'array', default: [] },
          }
        }
      }
    },
    preHandler: [ GUARD_REQUIRE_STEAMID.prehandler() ],
    async handler(req: FastifyRequest<{ Params: { steamid: string } }>, reply) {
      const steamid = GUARD_REQUIRE_STEAMID.get(req)

      const fetchStart = Date.now()

      const [bans] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT times_tried, id, public_message, bans.flags, bans.steamid, bans.executor, bans.reason, expires, expired, bans.timestamp, u1.last_name as client_name, u1.last_country as client_country, u2.last_name AS executor_name, ip
          FROM bans
          LEFT JOIN view_${TABLE_PREFIX}_user AS u1 ON SUBSTRING(bans.steamid, 11) = u1.account_id
          LEFT JOIN view_${TABLE_PREFIX}_user AS u2 ON SUBSTRING(bans.executor, 11) = u2.account_id
          WHERE SUBSTRING(bans.steamid, 11) = SUBSTRING(?, 11)`,
        [steamid.getSteam2RenderedID()]
      )

      const fetchTime = Date.now() - fetchStart

      const apiBans: FullAPIBan[] = []

      const parseStart = Date.now()

      for (const ban of bans) {
        // Grab their name either from l4d2 stats or from the resolve cache
        if (ban.client_name) {
          ban.client = {
            id: ban.steamid,
            name: ban.client_name,
            nameResolver: "view_${TABLE_PREFIX}_user"
          }
        } else {
          // User's name is not cached, fetch it:
          const steamid = new SteamID(ban.steamid)
          const user = await fastify.users.fetchUser(steamid)
          if (user) {
            ban.client = {
              id: ban.steamid,
              name: user?.name.replace(NAME_INVALID_CHAR_REPLACE, '�'),
              nameResolver: "name_db"
            }
          }
        }

        delete ban.country

        ban.executor = {
          id: ban.executor,
          name: ban.executor_name,
          nameResolver: ban.executor !== null ? "stats" : "none"
        }

        const [appeals] = await fastify.db.execute<RowDataPacket[]>(
          "SELECT id, state, message, ip, created, reject_reason, rejecter_id FROM ban_appeals WHERE ban_id = ?",
          [ban.id]
        )

        apiBans.push({
          id: ban.id,
          client: ban.client,
          reason: ban.reason,
          flags: ban.flags,
          timestamp: Number(ban.timestamp),
          publicReason: ban.public_message,
          executor: ban.executor,
          expires: ban.expires,
          expired: ban.expired,
          joinAttempts: ban.times_tried,
          ip: ban.ip,
          appeals: appeals.sort((b, a) => b.created - a.created) as BanAppeal[]
        })
      }

      const parseTime = Date.now() - parseStart

      return {
        meta: {
          fetchTime,
          parseTime,
          totalTime: fetchTime + parseTime,
        },
        bans: apiBans,
      }
    }
  })

}
