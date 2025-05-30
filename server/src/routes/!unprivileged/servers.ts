import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { APIListServersV2, APIListServersV2_Groups, APIListServersV2_GroupEntry, SERVER_TYPE_MAP, ServerAction, ServerStatus, APIListServerGroup} from '../../../../common-types/Server.js';
import Server from '../../modules/servers/Server.js';
import SocketClientUser from '../../modules/servers/SocketClientUser.js';
import { APIListServersV2_Server } from '../../../../common-types/Server';

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

    fastify.get('/v2', (req: FastifyRequest<{Querystring: {'compact'?: boolean}}>, reply) => {
        const groups: APIListServersV2_Groups = Object.fromEntries(Object.entries(fastify.servers.GroupsRecord).map(([id, data]) => {
            return [id, {
                name: data.Name,
                game: data.Type
            }]
        }))
        const servers = fastify.servers.getAll().map((server, i) => {
            return {
                id: server.id,
                name: server.name,
                groupId: server.group.Id,
                status: server.status,
                tags: server.tags,
                actions: server.actions,
                host: server.host,
                port: server.port
            } as APIListServersV2_Server
        })
        reply.send({
            groups,
            servers
        } as APIListServersV2)
        fastify.servers.resetInactivity()
    })

    fastify.get('/groups', async(req, reply) => {
        const groups: Record<string, APIListServerGroup> = Object.fromEntries(Object.entries(fastify.servers.GroupsRecord).map(([id, data]) => {
            return [id, {
                id: id,
                name: data.Name,
                game: data.Type,
                currentInstances: 0
            }]
        }))
        for(const server of fastify.servers.getAll()) {
            groups[server.group.Id].currentInstances ++
        }
        return {
            groups: Object.values(groups)
        } 
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