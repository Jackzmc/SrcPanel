import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { ADMINS_DB } from '../!!privileged/admins.js';
import SteamID from 'steamid';


const RECENT_DEFAULT_LIMIT = 25

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
                COALESCE(last_alias, user_names.name) as name, country, timestamp as lastJoinDate, created_date as firstJoinDate,
                server,
                client as steamid
            FROM activity_log
            LEFT JOIN user_names ON client = user_names.steamid
            LEFT JOIN stats_users ON client = stats_users.steamid
            WHERE
                TYPE = 'QUIT' AND server = IFNULL(?,server) AND client != ?
            ORDER BY activity_log.timestamp DESC
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
        return {
            users: rows.map(row => {
                return {
                    ...row,
                    country: row.country.length > 0 ? row.country : null 
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
        let adminData = undefined
        if(req.query.include === "admin") {
            adminData = fastify.authmngr.getAdmin(new SteamID(req.params.steamid))
            if(adminData) delete adminData.password
        }
        return {
            user: rows.length > 0 ? {
                ...rows[0],
                country: rows[0].country.length > 0 ? rows[0].country : null
            } : null,
            adminData
        }
    })

}