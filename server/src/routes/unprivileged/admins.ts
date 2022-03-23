import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async(req, res) => {
        // TODO: replace left4dead2 and left4dead2_admins with config vals
        // const adminConn = fastify.authmngr.getConnection()
        const [rows] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT identity as steamid, \`left4dead2\`.stats_users.last_alias as name
            FROM \`left4dead2-admins\`.sm_admins
            LEFT JOIN left4dead2.stats_users
            ON left4dead2.stats_users.steamid LIKE CONCAT('STEAM_%:%:', substring_index(\`left4dead2-admins\`.sm_admins.identity, ':',-1))
            ORDER BY immunity DESC, CHAR_LENGTH(flags) DESC`,
            []
        )

        return {
            admins: rows
        }
    })

}