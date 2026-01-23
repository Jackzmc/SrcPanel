import { WebSocket } from '@fastify/websocket';
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';

const CMS_HOST = process.env.CMS_HOST
const CMS_APIKEY = process.env.CMS_APIKEY

const COLLECTION_KEY_REGEX = new RegExp(/[a-zA-Z_]+/)

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    if(!CMS_HOST || !CMS_APIKEY) {
        fastify.log.info("CMS: Not enabled (not configured; set CMS_HOST, CMS_APIKEY)")
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

        const params = new URLSearchParams(req.query as Record<string, any>)
        const url = `/items/${req.params.collection}?${params.toString()}`

        return await doCmsRequest(reply, url, "GET")
    })

    async function doCmsRequest<T>(reply: FastifyReply, path: string, method: string = "GET"): Promise<T|undefined> {
        try {
            const url = `${CMS_HOST}${path}`
            reply.log.debug({}, 'url', url)
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${CMS_APIKEY}`
                },
                method
            })
            if(res.ok) {
                const json = await res.json()
                return json.data
            } else {
                reply.log.error(`CMS Error: ${res.status} ${res.statusText}`)
                return reply.status(500).send({
                    error: "CMS_ERROR",
                    status: res.status,
                    message: `CMS returned ${res.status} ${res.statusText}`
                })
            }
        } catch(err) {
            console.error("cms", err)
            reply.log.error({ cause: err.cause }, "CMS Error: ", err)
            return reply.status(503).send({
                error: "CMS_ERROR",
                message: `Failed to contact CMS: ${err.message}`
            })
        }
    }
}
