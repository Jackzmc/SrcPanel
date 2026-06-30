import { APIDeveloperGenerateKeyResponse, APIDeveloperResponse } from '@srcpanel/common/User';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async(req, reply): Promise<APIDeveloperResponse> => {
        await fastify.authmngr.verify(req, reply)
        return {
            apikey: await req.user!.getApiKey(),
            apps: {}
        }
    })

    fastify.post('/apikey', async (req, reply): Promise<APIDeveloperGenerateKeyResponse> => {
        await fastify.authmngr.verify(req, reply)
        const newApikey = await req.user!.regenerateApiKey()
        return {
            apikey: newApikey
        }
    })
}