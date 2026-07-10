import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { toPng } from 'jdenticon'

const IDENTICON_SIZE = 150
const STEAM_IMG_FETCH_TIMEOUT = 10_000

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.get("/:steamid/avatar", { logLevel: "warn" }, async (req: FastifyRequest<{ Querystring: { noCache?: boolean }, Params: { steamid: string } }>, reply) => {
    const clientController = new AbortController();
    const onClose = () => clientController.abort(new Error('client cancelled'));
    req.raw.on('close', onClose);

    console.log('get', req.params.steamid)

    const combinedSignal = AbortSignal.any([
      AbortSignal.timeout(STEAM_IMG_FETCH_TIMEOUT),
      clientController.signal,
    ]);

    const user = await fastify.users.getUser(req.params.steamid)
    reply.header("access-control-allow-origin", "*")
    reply.header("cross-origin-resource-policy", "cross-origin")
    console.log('got user')
    if (user?.avatarHash) {
      // Setup cache control to make the 301 have a lifetime
      if (!req.query.noCache) {
        reply.header("ETag", user.avatarHash)
        reply.header('Cache-Control', 'public, max-age 86400, s-maxage 604800, stale-while-revalidate 1382400, stale-if-error 1382400')
      }
      // If the hash is same - don't bother fetching
      if (req.query["If-None-Match"] !== user.avatarHash) {
        console.log('fetch')
        const res = await fetch(
          `https://avatars.steamstatic.com/${user.avatarHash}_full.jpg`, 
          { cache: "force-cache", signal: combinedSignal }
        )
        reply.header("Content-Type", "image/jpeg")
        return res.body
      }
      // return reply.redirect(`https://avatars.steamstatic.com/${user.avatarHash}_full.jpg`, 301)
    } else if (req.query["If-None-Match"] !== "no-avatar") {
      // Fallback to an identicon based off their steamid, incase we don't have the user information, or its not a real steam user.
      // If If-None-Match set and is 'no-avatar', we won't bother regenerating:
      try {
        console.log('generating')
        const buffer = toPng(req.params.steamid, IDENTICON_SIZE)
        if (buffer.length > 0 && !req.query.noCache) {
          reply.header("ETag", "no-avatar")
          reply.header('Cache-Control', 'public, max-age 86400, s-maxage 604800, stale-while-revalidate 1382400, stale-if-error 1382400')
        }
        reply.header("Content-Type", "image/png")
        reply.header('Content-Length', buffer.length)
        return buffer
      } catch (ex) {
        req.log.error(ex, "failed to generate identicon")
      }
    }
  })
}
