import { FastifyInstance } from 'fastify';
import FastifyPlugin from 'fastify-plugin'

import SteamAPI from '../modules/steam.js'

async function thing(fastify: FastifyInstance, opts) {
    const steam = new SteamAPI()
    fastify.decorate('steam', steam)
}

export default FastifyPlugin(thing)