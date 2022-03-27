import { FastifyInstance } from 'fastify';
import FastifyPlugin from 'fastify-plugin'
import ServerManager from '../modules/ServerManager.js';

import SteamAPI from '../modules/steam.js'

async function thing(fastify: FastifyInstance, opts) {
    const steam = new SteamAPI()
    fastify.decorate('steam', steam)

    fastify.decorate('servers', new ServerManager())
}

export default FastifyPlugin(thing)