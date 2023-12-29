import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { Keyvalue, Keyvalues, KeyConfig } from '../../../../common-types/Panel.js';
import { NO_PERMISSION } from '../../responses.js';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import Json5 from 'json5'
import { readFile, writeFile } from 'node:fs/promises';

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

    fastify.get('/config/:filename', async (req: FastifyRequest<{ Params: { filename: string }}>, reply) => {
        try {
            let content = await readFile(path.resolve('config/', req.params.filename), 'utf-8') 
            content = Json5.parse(content)
            return reply.send(content)
        } catch(err: any) {
            if(err.code === "ENOENT")
                return reply.status(404).send()
            throw err
        }
    })

    fastify.post('/config/:filename', async (req: FastifyRequest<{ Params: { filename: string }}>, reply) => {
        try {
            const prettyJson = JSON.stringify(req.body, null, 2)
            await writeFile(path.resolve('config/', req.params.filename), prettyJson,  { encoding: 'utf-8' })
            return reply.code(204).send()
        } catch(err: any) {
            if(err.code === "ENOENT")
                return reply.status(404).send()
            throw err
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