import { WebSocket } from '@fastify/websocket';
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    fastify.get('/', { websocket: true }, async (socket: WebSocket, req: FastifyRequest) => {
        console.log("request", req.id, socket.ip)
        socket.on("message", (msg) => {
            console.log(msg)
        })
    })
}