import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid'
import { WebPermission } from '../../modules/AuthManager.js';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.addHook('preHandler', async(req, reply) => {
        await fastify.authmngr.verify(req, reply)
        if(~req.session.permissions.webPermissions & WebPermission.RconAccess) {
            return reply.code(403).send({ 
                error: "NO_PERMISSION",
                message: "You are not authorized to access this resource"
            })
        }
    })

    fastify.get('/', async(req, reply) => {
        
    })
}