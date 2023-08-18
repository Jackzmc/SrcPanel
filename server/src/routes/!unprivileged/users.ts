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
                return reply.redirect(`https://avatars.steamstatic.com/${user.avatarHash}_full.jpg`)
            } else {
                // const username = await fastify.users.getStatsName(steamid)
                // const buffer = Buffer.from(GeoPattern.generate(req.params.steamid, { }).toBase64(), "base64")
                const buffer = await getIdenticon({ id: req.params.steamid, size: 150 })
                if(buffer.length > 0 && !req.query.noCache) {
                    reply.header("ETag", Buffer.from(IDENTICON_VERSION + req.params.steamid + buffer.length).toString('base64'))
                    reply.header('Cache-Control', 'public, maxage=29030400, stale-while-revalidate=86400, stale-if-error=86400')
                }
                reply.header("Content-Type", "image/png")
                reply.header('Content-Length', buffer.length)
                return buffer
                // return reply.redirect(`https://ui-avatars.com/api/?name=${username ?? "UNK"}`)
            }
        } catch(ex) {
            console.log(ex)
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