import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import SteamID from 'steamid';
import Identicon from 'identicon'

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    fastify.get("/:steamid/avatar", async (req: FastifyRequest<{Params: {steamid: string }}>, reply) => {
        try {
            const user = await fastify.users.getUser(req.params.steamid)
            console.log(user)
            if(user?.avatarHash) {
                return reply.redirect(`https://avatars.steamstatic.com/${user.avatarHash}.jpg`)
            } else {
                // const username = await fastify.users.getStatsName(steamid)
                // const buffer = Buffer.from(GeoPattern.generate(req.params.steamid, { }).toBase64(), "base64")
                const buffer = await getIdenticon({ id: req.params.steamid, size: 150 })
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