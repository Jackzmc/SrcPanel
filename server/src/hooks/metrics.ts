import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { getGlobalWriter, sendMetric } from "../modules/metrics/influx.js";

async function hook(fastify: FastifyInstance) {
    fastify.addHook('onRequest', async (req, reply) => {
        sendMetric("requests", 1, { 
            authenticated: req.user != undefined 
        })
    })
    fastify.addHook('onResponse', (req, reply) => {
        // Do not include query params - do not want to record them, especially for oauth/activity logs
        const url = req.urlData()
        sendMetric("req_time", reply.elapsedTime, { path: url.path })
    })
    fastify.addHook('onError', (req, reply) => {
        sendMetric("errors", 1, { statusCode: reply.statusCode })
    })

}

export default fastifyPlugin(hook)
