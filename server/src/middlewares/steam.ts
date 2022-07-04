import { FastifyInstance } from 'fastify';
import FastifyPlugin from 'fastify-plugin'
import ServerManager from '../modules/servers/ServerManager.js';

import { readFile } from 'fs/promises'

import SteamAPI from '../modules/steam.js'


async function thing(fastify: FastifyInstance, opts) {
    const steam = new SteamAPI()
    await steam.loadAppIdFile('assets/steam_appids.json')
    fastify.decorate('steam', steam)

    fastify.decorate('servers', new ServerManager())
}

export default FastifyPlugin(thing)