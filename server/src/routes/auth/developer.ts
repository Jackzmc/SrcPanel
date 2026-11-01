import { APIDeveloperGenerateKeyResponse, APIDeveloperResponse } from '@srcpanel/common/User';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { GUARD_REQUIRE_LOGGED_IN } from '../../guards/auth.js';


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get(
        '/', 
        { preHandler: [ GUARD_REQUIRE_LOGGED_IN.prehandler() ] },
        async(req, reply): Promise<APIDeveloperResponse> => {
            return {
                apikey: await req.user!.getApiKey(),
                apps: {}
            }
        }
    )

    fastify.post(
        '/apikey', 
        { preHandler: [ GUARD_REQUIRE_LOGGED_IN.prehandler() ] },
        async (req, reply): Promise<APIDeveloperGenerateKeyResponse> => {
            const newApikey = await req.user!.regenerateApiKey()
            return {
                apikey: newApikey
            }
        }
    )
}