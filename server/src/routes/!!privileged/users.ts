import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { ADMINS_DB } from '../!!privileged/admins.js';
import SteamID from 'steamid';
import { BanAppeal, FullAPIBan } from '../../../../common-types/Ban.js';
import { NAME_INVALID_CHAR_REPLACE } from '../../routes/!unprivileged/bans.js';
import { SteamUserDetails } from '../../../../common-types/Share.js';


const RECENT_DEFAULT_LIMIT = 25
const STEAM_ID_REGEX = new RegExp(/STEAM_\d:\d:\d+/)

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/recent/:server?', async(req: FastifyRequest<{Params: { server?: string }, Querystring: { limit?: number }}>, reply) => {
        let limit = req.query.limit ?? RECENT_DEFAULT_LIMIT
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
                ) as isAdmin,
                COALESCE(last_alias, user_names.name) as name, country, l.timestamp as lastJoinDate, created_date as firstJoinDate,
                server,
                client as steamid
            FROM activity_log l
            LEFT JOIN user_names ON client = user_names.steamid
            LEFT JOIN stats_users ON client = stats_users.steamid
            WHERE
                TYPE = 'QUIT' AND server = IFNULL(?,server) AND client != ?
            ORDER BY l.timestamp DESC
            LIMIT ?`, 
            [server, req.session.user.steamid, limit]
        )

        for(const row of rows) {
            if(!row.name) {
                const user = await fastify.users.fetchName(new SteamID(row.steamid))
                if(user) {
                    row.name = user.name
                }
            }
            row.isAdmin = row.isAdmin == 1
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
        const [rows] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT
            (SELECT COUNT(*) FROM notes WHERE SUBSTRING(notes.steamid,11) = SUBSTRING(stats_users.steamid,11)) as notesCount,
            (SELECT COUNT(*) FROM bans WHERE SUBSTRING(bans.steamid,11) = SUBSTRING(stats_users.steamid,11) ) as bansCount,
            (SELECT COUNT(*) FROM ${ADMINS_DB}.sm_admins WHERE ${ADMINS_DB}.sm_admins.identity = stats_users.steamid) as isAdmin,
            steamid, last_alias as name, country, last_join_date as lastJoinDate, created_date as firstJoinDate
            FROM stats_users
            WHERE SUBSTRING(steamid,11) = SUBSTRING(?, 11)`, 
            [ req.params.steamid ]
        )
        
        if(STEAM_ID_REGEX.test(req.params.steamid) && rows.length === 0) {
            const steamid = new SteamID(req.params.steamid)
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

        let adminData = undefined
        if(req.query.include === "admin") {
            adminData = fastify.authmngr.getAdmin(req.params.steamid)
            if(adminData) delete adminData.password
        }

        return {
            user: rows.length > 0 ? {
                ...rows[0],
                country: rows[0].country?.length > 0 ? rows[0].country : null
            } : null,
            adminData
        }
    })

    fastify.route({
        method: 'GET',
        url: '/:steamid/bans',
        schema: {
            params: {
                id: { type: 'string' }
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