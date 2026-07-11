import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { toPng } from 'jdenticon'
import { IUserData } from '../../modules/users/UserManager.js';

const IDENTICON_SIZE = 150
const STEAM_IMG_FETCH_TIMEOUT = 10_000
type AvatarRequest =  FastifyRequest<{ Querystring: { noCache?: boolean }, Params: { steamid: string } }>

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.get("/:steamid/avatar", { logLevel: "warn" }, async (req: AvatarRequest, reply) => {
    const clientController = new AbortController();
    const onClose = () => clientController.abort(new Error('client cancelled'));
    req.raw.on('close', onClose);

    try {
      const user = await fastify.users.getUser(req.params.steamid)
      reply.header("access-control-allow-origin", "*")
      reply.header("cross-origin-resource-policy", "cross-origin")

      if (user?.avatarHash) {
        return await handleSteamAvatar(user, clientController, req, reply)
      } else {
        return await handleGeneratedAvatar(req, reply)
      }
    } catch (ex) {
      req.log.error(ex, "avatar request error")
      return reply.code(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unknown error occurred while fetching avatar'
      })
    } finally {
      req.raw.off('close', onClose)
    }
  })
}

async function handleSteamAvatar(user: IUserData, clientController: AbortController, req: AvatarRequest, reply: FastifyReply) {
  const etag = `"${user.avatarHash}"`
  if (!req.query.noCache) {
    reply.header("ETag", etag)
    reply.header("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=1382400, stale-if-error=1382400")
    reply.header("X-Avatar-Src", "steam")
  }

  if (req.headers["if-none-match"] === etag) {
    return reply.code(304).send()
  }

  try {
    const res = await fetch(
      `https://avatars.steamstatic.com/${user.avatarHash}_full.jpg`,
      { 
        signal: AbortSignal.any([AbortSignal.timeout(STEAM_IMG_FETCH_TIMEOUT), clientController.signal]),
        headers: {
          'User-Agent': 'SrcPanel'
        }
      }
    )
    reply.header("Content-Type", "image/jpeg")
    return res.body
  } catch(err) {
    req.log.error({ steamid: req.params.steamid }, "failed to fetch avatar from steam: " + err)
    return reply.status(500).send({
      error: 'STEAM_FETCH_ERROR',
      message: 'Unable to fetch avatar from steam'
    })
  }
}

async function handleGeneratedAvatar(req: AvatarRequest, reply: FastifyReply) {
  const etag = '"identicon"'
  if (!req.query.noCache) {
    reply.header("ETag", etag)
    reply.header("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=1382400, stale-if-error=1382400")
    reply.header("X-Avatar-Src", "identicon")
  }
  if (req.headers["if-none-match"] === etag) {
    return reply.code(304).send()
  }

  try {
    const buffer = toPng(req.params.steamid, IDENTICON_SIZE)
    if (buffer.length > 0 && !req.query.noCache) {
      reply.header("ETag", etag)
      reply.header("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=1382400, stale-if-error=1382400")
    }
    reply.header("Content-Type", "image/png")
    reply.header("Content-Length", buffer.length)
    reply.header("X-Avatar-Src", "identicon")
    return buffer
  } catch(err) {
    req.log.error({ steamid: req.params.steamid }, "failed to generate identicon: " + err)
    return reply.status(500).send({
      error: 'AVATAR_GENERATION_ERROR',
      message: 'Unable to generate avatar'
    })
  }
}