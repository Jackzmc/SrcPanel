import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { ADMINS_DB } from '../!unprivileged/admins.js';


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/search/:query', async(req: FastifyRequest<{Params: { query: string }}>, reply) => {
        const query = `%${req.params.query}%`
        const [rows] = await fastify.db.execute(
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
            users: rows
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
            user: rows.length > 0 ? rows[0] : null
        }
    })

}