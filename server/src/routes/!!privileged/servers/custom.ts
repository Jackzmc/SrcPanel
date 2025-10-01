import { FastifyInstance, FastifyPluginOptions } from "fastify";
import CustomServerBuilder from "../../../modules/servers/CustomServerBuilder.js";
import { CustomServerGroup } from "../../../modules/servers/groups/CustomServerGroup.js";
import { ServerInfo } from "../../../../../common-types/Server.js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const PLUGIN_REPO_FOLDER_LOCATION = process.env.CUSTOM_SERVER_REPO_DIR!

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    /* metadata route
        return list of plugins (verify that there is SMX for every SP)
        
        /home/steam/custom-server-shared/{addons,plugins,extensions} <-- all symlinks
    */
    fastify.get('/meta', async(req, reply) => {
        const pluginRepo = await JSON.parse(await readFile(path.join(PLUGIN_REPO_FOLDER_LOCATION, 'plugins.json'), 'utf-8'))
        const { games } = await JSON.parse(await readFile(path.join(fastify.paths.config, '../config', 'custom_server.json'), 'utf-8'))
        return {
            plugins: pluginRepo,
            games: games
        }
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
    fastify.get('/create', async(req, reply) => {
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

        const group = fastify.servers.getGroup("l4d2-custom") as CustomServerGroup
        const builder = new CustomServerBuilder(fastify.steam, group)
        builder.SetEventCallback(onEvent)
        function onEvent(eventId: string, msg?: string, progress?: { current: number, total: number }) {
            send({
                event: eventId,
                msg,
                progress
            })
        }
        console.log("builder done")
        try {
            const abort = new AbortController()
            // fastify.addHook("preClose", (done) => {
            //     console.log("fastify is shutting down, triggering abort")
            //     abort.abort("FASTIFY_SHUTDOWN")
            //     done()
            // })
            console.log("creating from builder")
            const server = await builder.Create("Test Server", {
            extraPlayers: true,
            pluginsIds: ["adminpanel.sp", "l4d2_extraplayeritems.sp"],
            signal: abort.signal
        }, {
            steamid2: req.user!.steamid2,
        })
            send({
                server: {
                    id: server.ContainerInstance.ContainerId,
                    name: server.name,
                    serverId: server.id,
                    hostname: server.host,
                    ip: server.ip,
                    port: server.port,
                    type: server.game,
                }
            })
            reply.raw.end()
        } catch(err) {
            send({
                event: "ERROR",
                msg: err.message
            })
        }
        reply.hijack()
    })
}