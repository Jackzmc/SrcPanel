import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { ADMINS_DB } from '../!!privileged/admins.js';
import SteamID from 'steamid';
import { BanAppeal, FullAPIBan } from '../../../../common-types/Ban.js';
import { NAME_INVALID_CHAR_REPLACE } from '../../routes/!unprivileged/bans.js';
import { ReadableAdminData, UserProfileData } from '../../../../common-types/User.js';
import { NOT_FOUND, NO_PERMISSION } from '../../responses.js';


const RECENT_DEFAULT_LIMIT = 25
const STEAM_ID_REGEX = new RegExp(/STEAM_\d:\d:\d+/)

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/recent/:server?', async(req: FastifyRequest<{Params: { server?: string }, Querystring: { limit?: number }}>, reply) => {
        const domain = await fastify.config.GetKV("domain", "")
        let limit = Number(req.query.limit) ?? RECENT_DEFAULT_LIMIT
        if(limit < 0 || limit > 100) limit = RECENT_DEFAULT_LIMIT
        let server = req.params.server || null
        if(server === "all") server = null
        const start = Date.now()
        const [rows] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT
                (SELECT COUNT(*) FROM notes WHERE notes.steamid = client) as notesCount,
                (SELECT COUNT(*) FROM bans WHERE bans.steamid = client) as bansCount,
                (SELECT COUNT(*) FROM ${ADMINS_DB}.sm_admins 
                    WHERE SUBSTRING(${ADMINS_DB}.sm_admins.identity,11) = SUBSTRING(client, 11)
                    LIMIT 1
                ) as isAdmin,
                COALESCE(last_alias, user_names.name) as name, country, l.timestamp as lastJoinDate, created_date as firstJoinDate,
                server,
                client as steamid
            FROM activity_log PARTITION (p${new Date().getFullYear()}) l 
            LEFT JOIN user_names ON client = user_names.steamid
            LEFT JOIN stats_users ON client = stats_users.steamid
            WHERE
                TYPE = 'QUIT' AND server = IFNULL(?,server) AND client != ? AND ISNULL(target) 
            ORDER BY l.timestamp DESC
            LIMIT ?`, 
            [server, req.session.user.steamid, limit]
        )

        const bulkFetchSet = new Set<SteamID>()

        for(const row of rows) {
            if(!row.name) {
                bulkFetchSet.add(new SteamID(row.steamid))
            }
            row.avatarUrl = `${domain}/api/users/${row.steamid}/avatar`
            row.isAdmin = row.isAdmin === 1
        }

        if(bulkFetchSet.size > 0) {
            const users = await fastify.users.fetchUsers([...bulkFetchSet])
            // Add the names to the missing entries
            for(const row of rows) {
                for(const user of users) {
                    // user.steamid is their accountid, so we slice it off of steamid
                    if(user.steamid == row.steamid.slice(10)) {
                        row.name = user.name
                        break
                    }
                }
            }
        }

        return {
            meta: {
                queryTimeSec: Date.now() - start
            },
            users: rows
        }
    })


    fastify.get('/search/:query', async(req: FastifyRequest<{Params: { query: string }}>, reply) => {
        const query = req.params.query
        const fuzzyQuery = `%${query}%`
        const [rows] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT
            (SELECT COUNT(*) FROM notes WHERE notes.steamid = stats_users.steamid) as notesCount,
            (SELECT COUNT(*) FROM bans WHERE bans.steamid = stats_users.steamid) as bansCount,
            (SELECT COUNT(*) FROM ${ADMINS_DB}.sm_admins 
                WHERE SUBSTRING(${ADMINS_DB}.sm_admins.identity,11) = SUBSTRING(steamid, 11)
            ) as isAdmin,
            steamid, last_alias as name, country, last_join_date as lastJoinDate, created_date as firstJoinDate
            FROM stats_users
            WHERE SUBSTRING(steamid, 11) = SUBSTRING(:query, 11) or last_alias LIKE :fuzzyQuery
            ORDER BY last_join_date DESC
            LIMIT 10`, 
            { query, fuzzyQuery }
        )

        if(STEAM_ID_REGEX.test(req.params.query) && rows.length === 0) {
            const steamid = new SteamID(req.params.query)
            const userInfos = await fastify.steam.getUserDetails([steamid])
            if(userInfos.length > 0) {
                const userInfo = userInfos[0]
                rows.push({
                    steamid: steamid.getSteam2RenderedID(),
                    name: userInfo.personaname,
                    country: null,
                    lastJoinDate: null,
                    firstJoinDate: null,
                    notesCount: 0,
                    bansCount: 0,
                    isAdmin: false
                } as RowDataPacket)
            }
        }

        return {
            users: rows.map(row => {
                return {
                    ...row,
                    country: row.country?.length > 0 ? row.country : null 
                }
            })
        }
    })

    fastify.post('/:steamid/update', async(req: FastifyRequest<{Params: {steamid: string}}>, reply) => {
        if(!req.params.steamid || req.params.steamid.length < 10) {
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

    fastify.get('/:steamid/profile', async(req: FastifyRequest<{Params: { steamid: string }}>, reply): Promise<UserProfileData> => {
        const profile = await fastify.authmngr.getProfileData(req.params.steamid)
        if(!profile) return NOT_FOUND(reply, "User has no profile data")
        return profile
    })

    fastify.post('/:steamid/profile', async(req: FastifyRequest<{Params: { steamid: string }, Body: UserProfileData}>, reply): Promise<UserProfileData> => {
        if(req.params.steamid !== req.user!.steamid2) {
            return NO_PERMISSION(reply, "You can only edit your own profile")
        }
        await fastify.db.query<OkPacket>(
            "INSERT INTO `left4dead2-admins`.panel_user_data (steamid, birth_date, birth_month) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE birth_date = ?, birth_month = ?",
            [ req.user!.steamid2, req.body.birthDate, req.body.birthMonth, req.body.birthDate, req.body.birthMonth ]
        )
        return reply.status(204).send()
    })

    fastify.get('/:steamid', async(req: FastifyRequest<{
        Params: { steamid: string }, 
        Querystring: {
            include?: string,
        }
    }>, reply) => {
        if(!req.params.steamid || req.params.steamid.length < 10) {
            return reply.status(400).send({
                error: "INVALID_STEAMID",
                message: "Provided steamid is invalid"
            })
        }

        const [[userdata], [stats]] = await Promise.all([
            fastify.db.execute<RowDataPacket[]>(
                `SELECT
                    steamid, last_alias as name, country, last_join_date as lastJoinDate, created_date as firstJoinDate
                FROM stats_users
                WHERE SUBSTRING(steamid,11) = SUBSTRING(:steamid, 11) LIMIT 1`, 
                { steamid: req.params.steamid }
            ),
            fastify.db.execute<RowDataPacket[]>(
                `SELECT
                (SELECT COUNT(*) FROM notes WHERE SUBSTRING(notes.steamid,11) = SUBSTRING(:steamid, 11)) as notesCount,
                (SELECT COUNT(*) FROM bans WHERE SUBSTRING(bans.steamid,11) = SUBSTRING(:steamid, 11)) as bansCount,
                (SELECT COUNT(*) FROM ${ADMINS_DB}.sm_admins WHERE ${ADMINS_DB}.sm_admins.identity = :steamid) as isAdmin
                LIMIT 1`,
                { steamid: req.params.steamid }
            )
        ])

        let userInfo = {}
        
        if(userdata.length > 0) {
            userInfo = userdata[0]
        } else if(STEAM_ID_REGEX.test(req.params.steamid)) {
            const steamid = new SteamID(req.params.steamid)
            const userInfos = await fastify.steam.getUserDetails([steamid])
            if(userInfos.length > 0) {
                userInfo = {
                    steamid: steamid.getSteam2RenderedID(),
                    name: userInfos[0].personaname,
                    country: null,
                    lastJoinDate: null,
                    firstJoinDate: null,
                }
            }
        }

        let adminData: ReadableAdminData|null = null
        if(req.query.include === "admin") {
            adminData = fastify.authmngr.getAdminExport(req.params.steamid)
        }

        return {
            user: {
                ...userInfo,
                notesCount: stats[0].notesCount,
                bansCount: stats[0].bansCount,
                isAdmin: stats[0].isAdmin
            },
            adminData
        }
    })

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
        async handler(req: FastifyRequest<{ Params: { steamid: string }}>, reply) {
            const authorized = await fastify.authmngr.isAuthorized(req)

            const fetchStart = Date.now()

            const [bans] = await fastify.db.execute<RowDataPacket[]>(
                `SELECT times_tried, id, public_message, bans.flags, bans.steamid, bans.executor, bans.reason, expires, expired, bans.timestamp, u1.last_alias, names.name as resolved_name, u1.country, u2.last_alias AS executor_name, ip
                FROM bans 
                LEFT JOIN stats_users AS u1 ON bans.steamid = u1.steamid 
                LEFT JOIN stats_users AS u2 ON bans.executor = u2.steamid 
                LEFT JOIN user_names as names on SUBSTRING(bans.steamid, 11) = names.steamid
                WHERE SUBSTRING(bans.steamid, 11) = SUBSTRING(?, 11)`,
                [ req.params.steamid ]
            )

            const fetchTime = Date.now() - fetchStart

            const apiBans: FullAPIBan[] = []

            const parseStart = Date.now()

            for(let ban of bans) {
                if(!authorized) delete ban.reason
                
                // Grab their name either from l4d2 stats or from the resolve cache
                if(ban.last_alias) {
                    ban.client = {
                        id: ban.steamid,
                        name: ban.last_alias,
                        nameResolver: "stats"
                    }
                } else if(ban.resolved_name) {
                    ban.client = {
                        id: ban.steamid,
                        name: ban.resolved_name,
                        nameResolver: "name_db"
                    }
                } else {
                    // User's name is not cached, fetch it:
                    const steamid = new SteamID(ban.steamid)
                    const resolvedNames = await fastify.steam.getUserDetails([steamid])
                    const name = resolvedNames[0].personaname.replace(NAME_INVALID_CHAR_REPLACE, '�')
                    if(resolvedNames.length > 0) {
                        ban.client = {
                            id: ban.steamid,
                            name,
                            nameResolver: "name_db"
                        }
                        const accountid = steamid.getSteam2RenderedID().slice(10)
                        try {
                            await fastify.db.execute("INSERT INTO user_names (steamid, name) VALUES (?, ?)", [accountid, name])
                        } catch(err) {
                            console.warn(`Warn: Could not insert resolved name (${accountid}, name ${name}):`, err.sqlMessage)
                        }
                    }
                }

                if(authorized) ban.client.country = ban.country
                delete ban.country

                ban.executor = {
                    id: ban.executor,
                    name: ban.executor_name,
                    nameResolver: ban.executor !== null ? "stats" : "none"
                }

                const [appeals] = await fastify.db.execute<RowDataPacket[]>(
                    "SELECT id, state, message, ip, created, reject_reason, rejecter_id FROM ban_appeals WHERE ban_id = ?",
                    [ ban.id ]
                )

                apiBans.push({
                    id: ban.id,
                    client: ban.client,
                    reason: authorized ? ban.reason: undefined,
                    flags: ban.flags,
                    timestamp: Number(ban.timestamp),
                    publicReason: ban.public_message,
                    executor: ban.executor,
                    expires: ban.expires,
                    expired: ban.expired,
                    joinAttempts: ban.times_tried,
                    ip: ban.ip,
                    appeals: appeals.sort((b,a) => b.created - a.created) as BanAppeal[]
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