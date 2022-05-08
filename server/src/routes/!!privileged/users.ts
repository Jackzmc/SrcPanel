import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { ADMINS_DB } from '../!!privileged/admins.js';


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/recent/:server?', async(req: FastifyRequest<{Params: { server?: string }, Querystring: { limit?: number }}>, reply) => {
        let limit = req.query.limit ?? 20
        if(limit < 0 || limit > 100) limit = 20
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
                last_alias as name, country, timestamp as lastJoinDate, created_date as firstJoinDate,
                server,
                client as steamid
            FROM activity_log
            LEFT JOIN stats_users ON client = stats_users.steamid
            WHERE
                TYPE = 'QUIT' AND server = IFNULL(?,server) AND client != ?
            ORDER BY activity_log.timestamp DESC
            LIMIT ?`, 
            [server, req.session.user.steamid, limit]
        )

        return {
            meta: {
                queryTimeSec: Date.now() - start
            },
            users: rows
        }
    })


    fastify.get('/search/:query', async(req: FastifyRequest<{Params: { query: string }}>, reply) => {
        const query = `%${req.params.query}%`
        const [rows] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT
            (SELECT COUNT(*) FROM notes WHERE notes.steamid = stats_users.steamid) as notesCount,
            (SELECT COUNT(*) FROM bans WHERE bans.steamid = stats_users.steamid) as bansCount,
            (SELECT COUNT(*) FROM ${ADMINS_DB}.sm_admins WHERE ${ADMINS_DB}.sm_admins.identity = stats_users.steamid) as isAdmin,
            steamid, last_alias as name, country, last_join_date as lastJoinDate, created_date as firstJoinDate
            FROM stats_users
            WHERE steamid LIKE :query or last_alias LIKE :query
            ORDER BY last_join_date DESC
            LIMIT 10`, 
            { query }
        )
        return {
            users: rows.map(row => {
                return {
                    ...row,
                    country: row.country.length > 0 ? row.country : null 
                }
            })
        }
    })

    fastify.get('/:steamid', async(req: FastifyRequest<{Params: { steamid: string }}>, reply) => {
        const [rows] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT
            (SELECT COUNT(*) FROM notes WHERE notes.steamid = stats_users.steamid) as notesCount,
            (SELECT COUNT(*) FROM bans WHERE bans.steamid = stats_users.steamid) as bansCount,
            (SELECT COUNT(*) FROM ${ADMINS_DB}.sm_admins WHERE ${ADMINS_DB}.sm_admins.identity = stats_users.steamid) as isAdmin,
            steamid, last_alias as name, country, last_join_date as lastJoinDate, created_date as firstJoinDate
            FROM stats_users
            WHERE steamid = ?`, 
            [ req.params.steamid ]
        )
        return {
            user: rows.length > 0 ? {
                ...rows[0],
                country: rows[0].country.length > 0 ? rows[0].country : null
            } : null
        }
    })

}