import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import JWT,  { JsonWebTokenError } from '../../jwt-promise.js'
import { NOT_LOGGED_IN, NO_PERMISSION } from '../../responses.js';
const JWT_SECRET = process.env.STATE_SECRET

interface AuthTokenData {
    sub: string,
    issuer: string,
    iat: string
}

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
                    type: server.type,
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