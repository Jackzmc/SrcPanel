import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { SERVER_TYPE_MAP } from '../../../../common-types/Server.js';
import Server from '../../modules/servers/Server.js';

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
            reply.send(fastify.servers.getAllGrouped((server: Server) => {
                return {
                    name: server.name,
                    ip: server.ip,
                    port: server.port,
                    type: server.type,
                    tags: server.tags,
                    features: server.features,
                    domain: server.domain,
                    id: server.id,
                    status: server.status,
                    sortOrder: server.sortOrder,
                    actions: server.actions
                }
            }))
        }
        fastify.servers.resetInactivity()
    })
    
}