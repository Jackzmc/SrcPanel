import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import SteamID from 'steamid';
//@ts-ignore
import Identicon from 'identicon'

const IDENTICON_VERSION = "1.0.0"
export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    fastify.get("/:steamid/avatar", async (req: FastifyRequest<{Querystring: { noCache?: boolean }, Params: {steamid: string }}>, reply) => {
        try {
            const user = await fastify.users.getUser(req.params.steamid)
            if(user?.avatarHash) {
                // Setup cache control to make the 301 have a lifetime
                if(!req.query.noCache) {
                    reply.header("ETag", user.avatarHash)
                    reply.header('Cache-Control', 'public, maxage=29030400, stale-while-revalidate=86400, stale-if-error=86400')
                }
                return reply.redirect(301, `https://avatars.steamstatic.com/${user.avatarHash}_full.jpg`)
            } else {
                // Fallback to an identicon based off their steamid, incase we don't have the user information, or its not a real steam user.
                const buffer = await getIdenticon({ id: req.params.steamid, size: 150 })
                if(buffer.length > 0 && !req.query.noCache) {
                    reply.header("ETag", Buffer.from(IDENTICON_VERSION + req.params.steamid + buffer.length).toString('base64'))
                    reply.header('Cache-Control', 'public, maxage=29030400, stale-while-revalidate=86400, stale-if-error=86400')
                }
                reply.header("Content-Type", "image/png")
                reply.header('Content-Length', buffer.length)
                return buffer
            }
        } catch(ex) {
            req.log.error(ex, "failed to generate identicon")
        }
    })
}

function getIdenticon(options: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        Identicon.generate(options, (err: Error, buffer: Buffer) => {
            if(err) return reject(err)
            return resolve(buffer)
        })
    })
}