import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async(req, reply) => {
        await fastify.authmngr.verify(req, reply)
        return {
            apikey: await req.user!.getApiKey(),
            apps: {}
        }
    })

    fastify.post('/apikey', async (req, reply) => {
        await fastify.authmngr.verify(req, reply)
        const newApikey = await req.user!.regenerateApiKey()
        return {
            apikey: newApikey
        }
    })
}