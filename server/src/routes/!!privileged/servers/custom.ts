import { FastifyInstance, FastifyPluginOptions } from "fastify";

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
        return "5"
    })
}