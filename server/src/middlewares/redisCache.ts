import { createClient } from '@node-redis/client';
import { FastifyInstance } from 'fastify';
import FastifyPlugin from 'fastify-plugin'


async function cache(fastify: FastifyInstance, opts) {
    const client = createClient({
        url: process.env.REDIS_URI,
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USER,
        database: Number(process.env.REDIS_DATABASE) || 0,
        socket: {
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT)
        }
    });
    client.on('error', (err) => {
        fastify.log.error('[Redis Cache]', err)
    })
    await client.connect()
    fastify.decorate('cache', client)
}

export default FastifyPlugin(cache)