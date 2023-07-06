import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { Keyvalue, Keyvalues } from '../../modules/ConfigManager.js';
import { KeyConfig } from '../../modules/ConfigManager';
import { NO_PERMISSION } from '../../responses.js';

export interface ApiPanelConfig extends KeyConfig {
    value: string
}
export type PanelKeysRecord = Record<Keyvalue, ApiPanelConfig>

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async (req, reply) => {
        if(!req.user.hasPermission("panel.view")) return NO_PERMISSION(reply)
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

    fastify.get('/shares', async (req, reply) => {
        if(!req.user.hasPermission("panel.view")) return NO_PERMISSION(reply)
        const shares = await fastify.config.GetShares()
        // const shares = fastify.servers.shares.map(shareId => {
        //     const share = fastify.servers.getShare(shareId)
        //     return {
        //         id: shareId,
        //         name: share.name,
        //         sourceFolder: share.sourceFolder,
        //         destinations: share.destinations,
        //         appId: share.appId,
        //         validExtensions: share.exts,
        //         installSources: share.sources,
        //     }
        // })
        return {
            shares
        }
    })

    fastify.post('/kv', async (req, reply) => {
        if(!req.user.hasPermission("panel.manage")) return NO_PERMISSION(reply)
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