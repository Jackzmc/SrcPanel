import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';

import SteamID from 'steamid'
import fetch from 'node-fetch'

const STEAM_WEB_APIKEY = process.env.STEAM_WEB_APIKEY

interface Ban {
    id: number,
    steamid: string,
    reason: string,
    public_message: string,
    flags: number,
    timestamp: number,
    executor: string,
    expires: number,
    expired: boolean,
    times_tried: number
}

enum APIBanFlags {
    IPBan = 1,
    Suspended = 2
}

interface APIBan {
    id: number,
    client: {
        id: string,
        name: string,
        nameResolver?: "stats" | "steam-cache" | "steam" | "unknown"
    },
    reason?: string,
    publicReason: string,
    flags: number,
    timestamp: number,
    executor: {
        id: string,
        name: string,
        nameResolver?: "stats" | "steam-cache" | "steam" | "unknown"
    },
    expires: number,
    expired: boolean,
    joinAttempts: number
}

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    const db = fastify.db
    const cache = fastify.cache

    
    fastify.get('/stats', async(req, reply) => {
        const [bans] = await fastify.db.query(
            `SELECT DATE_FORMAT(bans.timestamp, '%Y-%m-%d') as x, COUNT(bans.timestamp) as y 
            FROM bans 
            GROUP BY YEAR(bans.timestamp), MONTH(bans.timestamp), DAY(bans.timestamp) 
            ORDER BY bans.timestamp ASC`,
            []
        );

        const [tkers] = await fastify.db.query(
            `SELECT DATE_FORMAT(FROM_UNIXTIME(activity_log.timestamp), '%Y-%m-%d') as x, COUNT(DISTINCT activity_log.timestamp) as y 
            FROM activity_log 
            WHERE message LIKE 'Excessive FF (%)' and TYPE = 'ACTION' GROUP BY YEAR(FROM_UNIXTIME(activity_log.timestamp)), MONTH(FROM_UNIXTIME(activity_log.timestamp)), DAY(FROM_UNIXTIME(activity_log.timestamp)) 
            ORDER BY activity_log.timestamp ASC`,
            []
        )

        return {
            bans,
            tkers
        }
    })

    fastify.route({
        method: 'GET',
        url: '/:id',
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
                        appeals: { type: 'array', default: [] }
                    }
                }
            }
        },
        async handler(req: FastifyRequest<{ Params: { id: string }}>, reply) {
            const id = req.params.id
            const authorized = await fastify.authmngr.isAuthorized(req)

            const fetchStart = Date.now()

            const [bans] = await db.execute<RowDataPacket[]>(
                `SELECT times_tried, id, public_message, bans.steamid, bans.executor, bans.reason, expires, expired, timestamp, u1.last_alias, u1.country, u2.last_alias AS executor_name
                FROM bans 
                LEFT JOIN stats_users AS u1 ON bans.steamid = u1.steamid 
                LEFT JOIN stats_users AS u2 ON bans.executor = u2.steamid 
                WHERE bans.id = ? or bans.steamid = ?`,
                [id, id]
            )

            const fetchTime = Date.now() - fetchStart

            const apiBans = []

            const parseStart = Date.now()

            for(const ban of bans) {
                if(!authorized) delete ban.reason
                
                if(ban.last_alias) {
                    ban.client = {
                        id: ban.steamid,
                        name: ban.last_alias,
                        nameResolver: "stats"
                    }
                } else {
                    const alias = await cache.get(`steamname.${ban.steamid}`)
                    if(alias) {
                        ban.client = {
                            id: ban.steamid,
                            name: alias,
                            nameResolver: "steam-cache"
                        }
                    } else { 
                        ban.client = {
                            id: ban.steamid,
                            name: null,
                            nameResolver: "none"
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
                })
            }

            const parseTime = Date.now() - parseStart

            const [appeals] = await db.execute(
                "SELECT * FROM `ban_appeals` WHERE `ban_id` = ?",
                [id]
            )

            return {
                meta: {
                    fetchTime,
                    parseTime,
                    totalTime: fetchTime + parseTime,
                },
                bans: apiBans,
                appeals
            }
        }
    })

    fastify.get('/', async(req, reply): Promise<{ meta: Record<string, number>, bans: APIBan[] }> => {
        const authorized = await fastify.authmngr.isAuthorized(req)

        let profilerStart = Date.now()
        let meta: Record<string, number> = {}

        const [rows] = await db.execute(`
            SELECT u1.last_alias,
                bans.id,
                bans.steamid,
                bans.reason,
                bans.public_message,
                bans.flags,
                bans.timestamp,
                bans.executor,
                u2.last_alias as executor_name,
                bans.expires,
                bans.expired,
                bans.times_tried,
                (SELECT COUNT(*) FROM ban_appeals WHERE ban_id = bans.id) as appeals,
                (SELECT COUNT(*) FROM notes WHERE steamid = bans.steamid) as notes
            FROM bans
                LEFT JOIN stats_users as u1 on bans.steamid = u1.steamid
                LEFT JOIN stats_users as u2 on bans.executor = u2.steamid
            ORDER BY bans.timestamp DESC`, 
            []
        )

        meta.fetchTime = Date.now() - profilerStart
        profilerStart = Date.now()

        // FIXME: Some cache values are leaking into the wrong ids

        const bulkNameFetchBuffer: { steamid: string, steamidc: SteamID, index: number }[] = []
        const bans = (rows as RowDataPacket[])
        const redisBuffer: Record<number, string> = {}


        for(let i = 0; i < bans.length; i++) {
            let ban = bans[i]
            ban.client = {
                id: ban.steamid,
                nameResolver: "none"
            }

            if(ban.last_alias) {
                ban.client.name = ban.last_alias
                ban.client.nameResolver = "stats"
            } else {
                //redisBuffer[i.toString()] = `steamname.${ban.steamid}`
            }

            ban.executor = {
                id: ban.executor,
                name: ban.executor_name,
                nameResolver: ban.executor !== null ? "stats" : "none"
            }
        }

        meta.initParse = Date.now() - profilerStart
        profilerStart = Date.now()

        /*const aliases = await cache.mGet(Object.values(redisBuffer))
        for(const key in aliases) {
            const alias = aliases[key]
            const ban = bans[key]
            if(alias) {
                bans[key].client.name = alias
                bans[key].client.nameResolver = "steam-cache"
            } else if(bulkNameFetchBuffer.length < 100) {
                bulkNameFetchBuffer.push({
                    steamid: ban.steamid,
                    steamidc: new SteamID(ban.steamid),
                    index: Number(key)
                })
            }
        }*/

        meta.cacheResolve = Date.now() - profilerStart
        profilerStart = Date.now()

        if(bulkNameFetchBuffer.length > 0) {
            const steamNames = await fastify.steam.getUserDetails(bulkNameFetchBuffer.map(b => b.steamidc))
            for(let i = 0; i < steamNames.length; i++) {
                const banIndex = bulkNameFetchBuffer[i].index
                bans[banIndex].name = steamNames[i].personaname,
                bans[banIndex].nameResolver = "steam"

                await cache.set(
                    `steamname.${bulkNameFetchBuffer[i].steamid}`, 
                    steamNames[i].personaname
                )
            }
        }

        meta.nameResolverTime = Date.now() - profilerStart

        meta.totalTime = Object.values(meta).reduce((a, b) => a + b);

        return {
            meta,
            bans: bans.map(row => {
                return {
                    meta: row.meta,
                    id: row.id,
                    client: row.client,
                    publicReason: row.public_message,
                    reason: authorized ? row.reason: undefined,
                    flags: row.flags,
                    timestamp: row.timestamp,
                    executor: row.executor,
                    expires: row.expires,
                    expired: row.expired,
                    joinAttempts: row.times_tried,
                    notesCount: row.notes,
                    appealsCount: row.appeals
                }
            })
        }
    })
}


