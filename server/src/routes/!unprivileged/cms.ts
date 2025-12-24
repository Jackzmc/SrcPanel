import { WebSocket } from '@fastify/websocket';
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';

const CMS_DOMAIN = process.env.CMS_DOMAIN
const CMS_APIKEY = process.env.CMS_APIKEY

const COLLECTION_KEY_REGEX = new RegExp(/[a-zA-Z_]+/)

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    if(!CMS_DOMAIN || !CMS_APIKEY) {
        fastify.log.info("CMS: Not enabled (not configured; set CMS_DOMAIN, CMS_APIKEY)")
        return
    }
    fastify.get('/:collection', async (req: FastifyRequest<{ Params: { collection: string }}>, reply: FastifyReply) => {
        // check that its a simple id, so they can't screw up our fetch
        if(!COLLECTION_KEY_REGEX.test(req.params.collection)) {
            return reply.status(400).send({
                error: "BAD_REQUEST",
                param: "collection",
                message: "Collection param is invalid"
            })
        }

        const url = new URL(`/items/${req.params.collection}`, CMS_DOMAIN)
        url.searchParams = req.raw.que


        const res = await fetch(`${CMS_DOMAIN}/items/${req.params.collection}`)
        if(res.ok) {
            return await res.json()
        }
    })
}