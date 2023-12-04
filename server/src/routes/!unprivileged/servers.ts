import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import JWT,  { JsonWebTokenError } from '../../jwt-promise.js'
import { NOT_LOGGED_IN, NO_PERMISSION } from '../../responses.js';
import { PluginServerStatus } from '../../../../common-types/Server.js';
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
    
    fastify.post('/status', async(req: FastifyRequest<{Params: {id: string}}>, reply) => {
        const authKey = req.headers['x-authtoken'] as string
        if(!authKey) {
            return NOT_LOGGED_IN(reply, "No auth token provided")
        }

        try {
            const data = await JWT.verify<Partial<AuthTokenData>>(authKey, JWT_SECRET)
            if(data.payload.iat && data.payload.issuer && data.payload.sub) {
                const server = fastify.servers.get(data.payload.sub)
                if(!server) {
                    return reply.code(404).send({
                        error: "SERVER_NOT_FOUND",
                        message: "Server not found"
                    })
                }
                const subscribers = server.setLiveData(req.body as PluginServerStatus)
                return reply.status(subscribers > 0 ? 200 : 410).send({subscribers})
            } else {
                return NO_PERMISSION(reply, "Auth token is invalid")
            }
        } catch(err) {
            if(err instanceof JsonWebTokenError) {
                return NO_PERMISSION(reply, "Could not verify auth token:\n" + err.message)
            }
            throw err
        }
    })

}