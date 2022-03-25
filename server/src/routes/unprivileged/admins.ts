import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';

const MAIN_DB = process.env.MYSQL_DB ? `\`${process.env.MYSQL_DB}\`` : null
const ADMINS_DB = process.env.MYSQL_ADMINS_DB ? `\`${process.env.MYSQL_ADMINS_DB}\`` : null

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async(req, res) => {
        const [rows] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT identity as steamid, ${MAIN_DB}.stats_users.last_alias as name
            FROM \`${ADMINS_DB}\`.sm_admins
            LEFT JOIN ${MAIN_DB}.stats_users
            ON ${MAIN_DB}.stats_users.steamid LIKE CONCAT('STEAM_%:%:', substring_index(${ADMINS_DB}.sm_admins.identity, ':',-1))
            ORDER BY immunity DESC, CHAR_LENGTH(flags) DESC`,
            []
        )

        return {
            admins: rows
        }
    })

}