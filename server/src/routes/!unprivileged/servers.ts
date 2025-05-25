import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { SERVER_TYPE_MAP } from '../../../../common-types/Server.js';
import Server from '../../modules/servers/Server.js';
import SocketClientUser from '../../modules/servers/SocketClientUser.js';

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
                    host: server.host,
                    ip: server.ip,
                    port: server.port,
                    type: SERVER_TYPE_MAP[server.type] ?? server.type,
                    tags: server.tags,
                    features: server.features,
                    domain: server.host,
                    id: server.id,
                    status: server.status,
                    sortOrder: server.sortOrder,
                    actions: server.actions,
                    online: server.Online,
                }
            }))
        }
        fastify.servers.resetInactivity()
    })

    fastify.get('/:id/ws', { websocket: true }, async (socket, req: FastifyRequest<{Params: {id: string}}>) => {
        if(!req.user) return socket.close(4000, "NOT_AUTHENTICATED");
        const server = fastify.servers.getServer(req.params.id);
        if(!server) return socket.close(4000, "SERVER_NOT_FOUND");
        const client = new SocketClientUser(socket, req.user!, req)

        server.addWSClient(client)

        socket.on("close", (code, reason) => {
            server.removeWSClient(client)
        })

        socket.on('message', message => {
            console.log("msg", message)
            client.sendPayload({
                type: "error",
                error: "UNSUPPORTED"
            })
        })

        await server.refreshStatus(true)
    })
}