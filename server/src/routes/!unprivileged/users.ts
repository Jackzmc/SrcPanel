import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { toPng } from 'jdenticon'

const IDENTICON_VERSION = "2"
const IDENTICON_SIZE = 150
export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    fastify.get("/:steamid/avatar", async (req: FastifyRequest<{Querystring: { noCache?: boolean }, Params: {steamid: string }}>, reply) => {
        const user = await fastify.users.getUser(req.params.steamid)
        reply.header("access-control-allow-origin", "*")
        if(user?.avatarHash) {
            // Setup cache control to make the 301 have a lifetime
            if(!req.query.noCache) {
                reply.header("ETag", user.avatarHash)
                reply.header('Cache-Control', 'public, maxage=29030400, stale-while-revalidate=86400, stale-if-error=86400')
            }
            return reply.redirect(`https://avatars.steamstatic.com/${user.avatarHash}_full.jpg`, 301)
        } else {
            // Fallback to an identicon based off their steamid, incase we don't have the user information, or its not a real steam user.
            try {
                const buffer = toPng(req.params.steamid, IDENTICON_SIZE)
                if(buffer.length > 0 && !req.query.noCache) {
                    reply.header("ETag", Buffer.from(IDENTICON_VERSION + req.params.steamid + buffer.length).toString('base64'))
                    reply.header('Cache-Control', 'public, maxage=29030400, stale-while-revalidate=86400, stale-if-error=86400')
                }
                reply.header("Content-Type", "image/png")
                reply.header('Content-Length', buffer.length)
                return buffer
            } catch(ex) {
                req.log.error(ex, "failed to generate identicon")
            }
        }
    })
}