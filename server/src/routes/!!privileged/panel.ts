import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { NO_PERMISSION } from '../../responses.js';
import Server from '../../modules/servers/Server.js';
import { CustomServerGroup } from '../../modules/servers/groups/CustomServerGroup.js';
import { DynamicServerGroup } from '../../modules/servers/groups/DynamicServerGroup.js';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.get('/', async (req, reply) => {
    if (!req.user!.hasPermission("panel.view")) return NO_PERMISSION(reply)
    return fastify.config.Config
  })

  fastify.post('/recreate-servers', async (req: FastifyRequest, reply) => {
    for (const group of fastify.servers.Groups) {
      if (group instanceof CustomServerGroup || group instanceof DynamicServerGroup) {
        await group.recreateServers()
      }
    }
  })

  fastify.get('/jobs', async (req, reply) => {
    const jobs = fastify.jobs.getNamedTasks()
    return {
      jobs
    }
  })

  fastify.post('/reload-config', async (req, reply) => {
    try {
      await fastify.config.Reload()
      return reply.status(204).send()
    } catch (err) {
      fastify.log.error("Reload failed: " + err)
      return reply.status(500).send({
        error: "RELOAD_FAILED",
        message: err.message
      })
    }
  })

  fastify.post('/restart', async (req, reply) => {
    if (!req.user!.hasPermission("panel.restart")) return NO_PERMISSION(reply)
    await reply.status(204).send()
    await fastify.close()
    process.exit()
  })

  fastify.post('/update-admins', async (req, reply) => {
    await fastify.authmngr.refreshAdmins()
    await reply.status(204).send()
  })

  fastify.get('/groups', async (req, reply) => {
    // if(!req.user.hasPermission("panel.restart")) return NO_PERMISSION(reply)
    const groups = fastify.servers.Groups
    return reply.send(groups)
  })

  fastify.delete('/groups/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    // await fastify.servers.deleteGroup(req.params.id)
    // const group = await fastify.server
  })

  fastify.put('/groups/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    // await fastify.servers.setGroup(req.params.id, req.body)
  })

  fastify.get('/servers', async (req, reply) => {
    return fastify.servers.getAllGrouped((server: Server) => {
      return {
        id: server.id,
        name: server.name,
        host: server.host,
        ip: server.ip,
        port: server.port,
        type: server.game,
        tags: server.tags,
        features: server.features,
        domain: server.host,
        actions: server.actions.filter(a => !a.inherited)
      }
    })
  })
}