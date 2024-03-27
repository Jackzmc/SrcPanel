import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { SERVER_TYPE_MAP } from '../../../../common-types/Server.js';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {

    fastify.get('/', (req: FastifyRequest<{Querystring: {'compact'?: boolean}}>, reply) =>  {
        if(req.query.compact) {
            const servers = fastify.servers.getAll()
            reply.send(servers.map(server => {
                return { 
                    id: server.id,
                    name: server.name,
                }
            }))
        } else {
            reply.send(fastify.servers.getAllGrouped(server => {
                return {
                    name: server.name,
                    ip: server.ip,
                    group: server.group,
                    port: server.port,
                    type: SERVER_TYPE_MAP[server.type] ?? server.type,
                    tags: server.tags,
                    domain: server.domain,
                    id: server.id,
                    status: server.status,
                    sortOrder: server.sortOrder
                }
            }))
        }
        fastify.servers.resetInactivity()
    })
    
}