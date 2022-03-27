import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid'

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.addHook('preHandler', async(req, reply) => {
        await fastify.authmngr.verify(req, reply)
    })
}