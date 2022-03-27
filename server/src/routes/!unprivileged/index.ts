import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { ACTIVITY_LOG_TABLE_NAME } from '../!!privileged/logs.js';
import { generateParams } from '../!!privileged/logs.js';
import { ServerStatus } from '../../modules/servers/Server.js';

const LimitedLogQuery = Type.Object({
    servers: Type.Optional(Type.String()),
    types: Type.Optional(Type.String()),
    client: Type.Optional(Type.String()),
    target: Type.Optional(Type.String()),
    timestamp: Type.Optional(Type.Integer()),
    timestampBefore: Type.Optional(Type.Boolean()),
    orderByColumn: Type.Optional(Type.String()),
    orderByAscending: Type.Optional(Type.Boolean()),
    searchMessage: Type.Optional(Type.String()),
    search_message: Type.Optional(Type.String()),
    fetchAll: Type.Optional(Type.Boolean()),
    timestampOnly: Type.Optional(Type.Boolean({ default: false }))
})
type LimitedLogQueryType = Static<typeof LimitedLogQuery>

const GRAPH_WHITELIST = {
    "types": ["ACTION", "STATE", "QUIT", "JOIN"]
};


interface DisplayedServer {
    id?: string;
    name: string;
    domain ? : string;
    ip: string,
    port: number,
    type: string,
    tags: Readonly<string[]>,
    status: ServerStatus
}
export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    fastify.get('/servers', async(req, reply): Promise<DisplayedServer[]> =>  {
        return fastify.servers.getAll().map(server => {
            return {
                name: server.name,
                ip: server.ip,
                port: server.port,
                type: server.type,
                tags: server.tags,
                domain: server.domain,
                id: server.id,
                status: server.status
            }
        })
    })

    fastify.get('/graph', async(req: FastifyRequest<{Querystring: LimitedLogQueryType}>, reply) => {
        const searchMessage = req.query.searchMessage ? `%${req.query.searchMessage}%` : (req.query.search_message ? `%${req.query.search_message}%` : null)

        let query: string;

        if(req.query.timestampOnly) {
            query = `SELECT timestamp, message FROM ${ACTIVITY_LOG_TABLE_NAME} `
        } else {
            query = `SELECT id, timestamp, server, type, client, target, message, s1.last_alias as clientName, s2.last_alias as targetName FROM activity_log LEFT JOIN stats_users as s1 ON s1.steamid = client LEFT JOIN stats_users as s2 ON s2.steamid = target `
        }


        const conditions = []
        let data = []

        if(req.query.servers) {
            const servers = req.query.servers.split(",")
            console.log('servers', servers.length, servers)
            conditions.push(`server IN (${generateParams(servers.length)})`)
            data = [ ...data, ...servers ]
        }
        if(req.query.types) {
            const types = req.query.types.split(",")
            for(const type of types) {
                if(!GRAPH_WHITELIST.types.includes(type)) {
                    return reply.code(403).send({
                        error: 'QUERY_NOT_ALLOWED',
                        message: `Type ${type} is not in the query whitelist`,
                        whitelist: GRAPH_WHITELIST
                    })
                }
            }
            console.log('types', types.length, types)
            conditions.push(`type IN (${generateParams(types.length)})`)
            data = [ ...data, ...types ]
        }
        if(req.query.client && req.query.target) {
            conditions.push('(client = ? OR target = ?)')
            data = [ ...data, req.query.client, req.query.target ]
        } else if(req.query.client && !req.query.target) {
            conditions.push('client = ?')
            data.push(req.query.client)
        } else if(!req.query.client && req.query.target) {
            conditions.push('target = ?')
            data.push(req.query.target)
        }

        if(req.query.timestamp) {
            conditions.push(req.query.timestampBefore ? 'timestamp <= ?' : 'timestamp >= ?')
            data.push(req.query.timestamp)
        }

        if(searchMessage) {
            conditions.push(`message LIKE ?`)
            data.push(searchMessage)
        }

        if(conditions.length > 0) {
            query += `WHERE ${conditions.join(' AND ')} `
        }

        query += `ORDER BY id ${req.query.orderByAscending ? 'ASC' : 'DESC'} `

        const [logs] = await fastify.db.query(query, data)
        

        return {
            logs,
        }
    })

}