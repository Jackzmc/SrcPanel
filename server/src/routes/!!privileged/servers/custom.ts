import { FastifyInstance, FastifyPluginOptions } from "fastify";
import CustomServerBuilder from "../../../modules/servers/CustomServerBuilder.js";

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    /* metadata route
        return list of plugins (verify that there is SMX for every SP)
        
        /home/steam/custom-server-shared/{addons,plugins,extensions} <-- all symlinks
    */
    fastify.get('/plugins', async(req, reply) => {

    })


    /* Steps:
    1. generate id (nanoid? sliced uuid?)
    2. create folder in /data/custom-servers/<id>/{cfg,addons} and
    3. install metamod, sourcemod onto addons
    4. setup initial configs
        databases.cfg
        admins_simple with owner's steamid
        autoexec.cfg from template
        server.cfg from template
    5. symlink all customer plugins
    6. resolve all workshop links (should be cached) & download all
    7. create docker instance, with hard limits on memory (1gb), storage (2gb?), cpu (?), assign random port from 27200 range
    8. done
    
    */
    fastify.post('/', async(req, reply) => {
        reply.raw.writeHead(200, {
            'Cache-Control': 'no-cache,no-transform',
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        function send(msg: object, eventName?: string) {
            if(eventName) reply.raw.write(`event: ${eventName}\n\n`)
            reply.raw.write(`data: ${JSON.stringify(msg)}\n\n`)
        }
        reply.raw.flushHeaders()
        reply.raw.write('retry: 5000\n\n')

        const builder = new CustomServerBuilder("Test Server", {
            extraPlayers: true,
            pluginsIds: ["adminpanel.sp", "l4d2_extraplayeritems.sp"]
        })
        function onEvent(eventId: string, msg?: string) {
            send({
                event: eventId,
                msg
            })
        }
        try {
            await builder.Create(onEvent)
            reply.raw.end()
        } catch(err) {
            send({
                error: err.message
            })
        }
        reply.hijack()
    })
}