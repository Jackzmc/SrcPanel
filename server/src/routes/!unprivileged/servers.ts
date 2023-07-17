import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import JWT,  { JsonWebTokenError } from '../../jwt-promise.js'
import { NOT_LOGGED_IN, NO_PERMISSION } from '../../responses.js';
import { IncomingPluginServerStatus } from '../../../../common-types/Server.js';
const JWT_SECRET = process.env.STATE_SECRET

interface AuthTokenData {
    sub: string,
    issuer: string,
    iat: string
}

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
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
                server.setStatus(req.body as IncomingPluginServerStatus)
                return reply.status(204).send()
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