import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {

    fastify.get('/', async(req, reply) => {
        return {
            apikey: (await req.user.getApiKey()).uuid,
            apps: {}
        }
    })

    fastify.post('/apikey', async (req, reply) => {
        await req.user.regenerateApiKey()
    })
}