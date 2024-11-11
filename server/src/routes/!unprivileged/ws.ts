import { WebSocket } from '@fastify/websocket';
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    fastify.get('/', { websocket: true }, async (socket: WebSocket, req: FastifyRequest) => {
        // authentiate using existing session cookie?
        console.log("cookies", req.cookies)
        socket.on('message', async message => {
            try {
                const json = JSON.parse(message.toString())
                console.log(req.id, json)
                if(json.apikey) {
                    const apikey = await fastify.authmngr.getAPIKey(json.apikey)
                    socket.send(JSON.stringify({
                        steamid: apikey.steamid
                    }))
                }
            } catch(err) {
                console.log(req.id, err)
                socket.send(JSON.stringify({
                    error: "PARSE_ERROR",
                    message: err.message
                }))
            }
        })
    })
}