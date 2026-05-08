import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { DynamicServerGroup } from '../../modules/servers/groups/DynamicServerGroup.js';
import SysInfo from 'systeminformation'
import type { APICreateGroupInstanceResult } from '@jzpanel/common/Server';

const MIN_MEMORY_PERCENT_AVAILABLE = 0.25
const MIN_CPU_PERCENT_FREE = 0.10

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.post('/:groupId/servers', 
        async (req: FastifyRequest<{Params: { groupId: string}, Querystring: { start: boolean }}>, reply): Promise<APICreateGroupInstanceResult> => 
        {
            // TODO: check for enough resources. ~300 MB (<= 2%), 1.5% cpu idle]
            const cpu = await SysInfo.currentLoad()
            const avgLoadPercent = cpu.avgLoad / 100
            if((1.0 - avgLoadPercent) < MIN_CPU_PERCENT_FREE) {
                return reply.status(403).send({
                    error: "NO_FREE_RESOURCES",
                    type: "CPU",
                    cpu: {
                        avgLoad: avgLoadPercent,
                        currentLoad: cpu.currentLoad / 100,
                        threshold: MIN_CPU_PERCENT_FREE
                    },
                    message: "System CPU resources have reached their limit, no new servers can be created at this time."
                })
            }
            const memory = await SysInfo.mem()
            const memoryPercent = memory.available / memory.total
            if(memoryPercent < MIN_MEMORY_PERCENT_AVAILABLE) {
                return reply.status(403).send({
                    error: "NO_FREE_RESOURCES",
                    type: "MEMORY",
                    memory: {
                        available: memory.available,
                        total: memory.total,
                        percentAvailable: memoryPercent,
                        threshold: MIN_MEMORY_PERCENT_AVAILABLE
                    },
                    message: "System Memory resources have reached their limit, no new servers can be created at this time."
                })
            }

            const group = fastify.servers.getGroup(req.params.groupId)
            if(!group) {
                return reply.status(404).send({
                    error: "INVALID_GROUP",
                    message: `No group found with id ${req.params.groupId}`
                })
            }
            if(group instanceof DynamicServerGroup) {
                try {
                    const server = await group.createNewServer()
                    if(req.query.start) {
                        await server.start()
                    }
                    return {
                        id: server.ContainerInstance.ContainerId,
                        name: server.name,
                        serverId: server.id,
                        hostname: server.host,
                        ip: server.ip,
                        port: server.port,
                        type: server.game,
                    }
                } catch(err: any) {
                    req.log.error(`[groups/${req.params.groupId}] ERROR: Failed to create instance:`, err)
                    return reply.status(500).send({
                        error: "CREATE_ERROR",
                        message: err.message
                    })
                }
            } else {
                return reply.status(400).send({
                    error: "INVALID_GROUP_TYPE",
                    message: `The group is not a dynamic group and cannot create instances`
                })
            }
        })
}