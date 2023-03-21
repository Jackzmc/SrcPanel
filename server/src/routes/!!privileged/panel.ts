import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { Keyvalue, Keyvalues } from '../../modules/ConfigManager.js';
import { KeyConfig } from '../../modules/ConfigManager';

export interface ApiPanelConfig extends KeyConfig {
    value: string
}
export type PanelKeysRecord = Record<Keyvalue, ApiPanelConfig>

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async (req, reply) => {
        let kv = {}
        for(const [key, value] of Object.entries(Keyvalues)) {
            kv[key] = {
                ...value,
                value: await fastify.config.GetKV(key as Keyvalue, "")
            }
        }
        
        return {
            keys: kv
        }
    })
    fastify.post('/kv', async (req, reply) => {
        if(req.headers['content-type']?.toLowerCase() !== "application/json") {
            return reply.status(400).send({
                error: "INVALID_BODY",
                message: "The body of the request must be a json object of key value pairs"
            })
        }


        for(const [key, value] of Object.entries(req.body)) {
            if(!(key in Keyvalues)) {
                return reply.status(400).send({
                    error: "UNKNOWN_KV",
                    message: `The key "${key}" is not a valid keyvalue key`
                })
            }

            await fastify.config.SetKV(key as Keyvalue, value)
        }

        return reply.status(204).send()
    })
}