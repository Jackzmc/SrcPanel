import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';

const DISCORD_APP_ID = process.env.DISCORD

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.addHook('preHandler', async(req, reply) => {
        await fastify.authmngr.verify(req, reply)
    })

    fastify.get('/link', (req, reply) => {
        const appId = fastify.config.GetKV("discord.appid")
        if(!appId) return reply.send("<h1>Discord not supported</h1>")
        return reply.redirect(`https://discordapp.com/oauth2/authorize?client_id=${appId}&scope=bot&permissions=52224`)
    })
}