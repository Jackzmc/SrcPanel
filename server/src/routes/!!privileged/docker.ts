import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    const manager = fastify.servers.Docker

    fastify.get('/templates', (req, reply) => {
        return manager.Templates
    })

    fastify.post('/templates/:templateId/create-server', async (req: FastifyRequest<{Params: {templateId: string}, Querystring: { start?: boolean }}>, reply) => {
        if(!req.params.templateId) {
            return reply.code(400).send({
                error: "MISSING_TEMPLATE_ID",
                message: "A valid template id must be provided"
            })
        }
        try {
            const instance = await manager.createInstance(req.params.templateId)
            if(req.query.start) {
                await instance.start()
            }
            return {
                id: instance.ContainerId,
                ip: instance.Ip,
                port: instance.Port,
                hostname: instance.Hostname
            }
        } catch(err) {
            return reply.code(500).send({
                error: "CREATE_INSTANCE_ERROR",
                message: err.message
            })
        }
    })

    fastify.post('/templates/:templateId/update', async (req: FastifyRequest<{Params: {templateId: string}}>, reply) => {
        if(!req.params.templateId) {
            return reply.code(400).send({
                error: "MISSING_TEMPLATE_ID",
                message: "A valid template id must be provided"
            })
        }
        const template = manager.getTemplate(req.params.templateId)
        if(!template) {
            return reply.code(404).send({
                error: "NO_TEMPLATE_FOUND",
                message: "No template with that id was found"
            })
        }

        await manager.updateTemplate(template)
        return reply.code(200).send()
    })

    fastify.get('/instances/:id', async (req: FastifyRequest<{Params: {id: string}}>, reply) => {
        if(!req.params.id) {
            return reply.code(400).send({
                error: "MISSING_INSTANCE_ID",
                message: "A valid instance id must be provided. They will be in the format of panel-{templateId}-{port}"
            })
        }
        const instance = manager.getInstance(req.params.id)
        if(!instance) {
            return reply.code(404).send({
                error: "INVALID_INSTANCE_ID",
                message: "No instance with id could be found. They will be in the format of panel-{templateId}-{port}"
            })
        }
        return {
            hostname: instance.Hostname,
            state: await instance.state()
        }
    })

    // TEMP
    fastify.get('/instances/:id/logs', async (req: FastifyRequest<{Params: {id: string}}>, reply) => {
        if(!req.params.id) {
            return reply.code(400).send({
                error: "MISSING_INSTANCE_ID",
                message: "A valid instance id must be provided. They will be in the format of panel-{templateId}-{port}"
            })
        }
        const instance = manager.getInstance(req.params.id)
        if(!instance) {
            return reply.code(404).send({
                error: "INVALID_INSTANCE_ID",
                message: "No instance with id could be found. They will be in the format of panel-{templateId}-{port}"
            })
        }
        return {
            logs: await instance.fetchLogs()
        }
    })

    fastify.post('/instances/:id/start', async (req: FastifyRequest<{Params: {id: string}}>, reply) => {
        if(!req.params.id) {
            return reply.code(400).send({
                error: "MISSING_INSTANCE_ID",
                message: "A valid instance id must be provided. They will be in the format of panel-{templateId}-{port}"
            })
        }
        const instance = manager.getInstance(req.params.id)
        if(!instance) {
            return reply.code(404).send({
                error: "INVALID_INSTANCE_ID",
                message: "No instance with id could be found. They will be in the format of panel-{templateId}-{port}"
            })
        }
        await instance.start()
        return reply.status(204).send()
    })
}