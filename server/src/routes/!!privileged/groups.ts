import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { DynamicServerGroup } from '../../modules/servers/groups/DynamicServerGroup.js';
import { hostname } from 'os';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.post('/:groupId/servers', async (req: FastifyRequest<{Params: { groupId: string}, Querystring: { start: boolean }}>, reply) => {
        let group = fastify.servers.getGroup(req.params.groupId)
        if(!group) {
            return reply.status(404).send({
                error: "INVALID_GROUP",
                message: `No group found with id ${req.params.groupId}`
            })
        }
        if(group instanceof DynamicServerGroup) {
            const server = await group.createNewServer()
            if(req.query.start) {
                await server.start()
            }
            return {
                id: server.ContainerInstance.ContainerId,
                name: server.name,
                serverId: server.id,
                hostname: server.domain,
                ip: server.ip,
                port: server.port,
                type: server.port,
            }
        } else {
            return reply.status(400).send({
                error: "INVALID_GROUP_TYPE",
                message: `The group is not a dynamic group and cannot create instances`
            })
        }
    })


}