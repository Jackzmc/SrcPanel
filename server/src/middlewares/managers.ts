import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import FastifyPlugin from 'fastify-plugin'
import AuthManager from '../modules/auth/AuthManager.js';

import mysql from 'mysql2/promise'
import { mkdir } from 'fs/promises'
import UserManager from '../modules/users/UserManager.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import ServerManager from '../modules/servers/ServerManager.js';
import SteamAPI from '../modules/steam.js'
import User from '../modules/users/User.js';
import ConfigManager from '../modules/ConfigManager.js';
import { UserPrivilegeCode } from '../../../common-types/Privileges.js';
import { SESSION_VERSION } from '../routes/auth/steam.js';
import { NOT_LOGGED_IN } from '../responses.js';
import DiscussionManager from '../modules/DiscussionManager.js';
import SetCache from '../modules/SetCache.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function db(fastify: FastifyInstance) {
    const ASSETS_FOLDER = join(__dirname, '/../../../../assets')
    const DATA_FOLDER = join(__dirname, '/../../../../data')
    const CONFIG_FOLDER = join(__dirname, '/../../../../config')
    console.log('assets', ASSETS_FOLDER)
    console.log('data', DATA_FOLDER)
    console.log('config', CONFIG_FOLDER)
    try {
        await mkdir(DATA_FOLDER)
    } catch(_) { }
    
    const steam = new SteamAPI()
    await steam.loadAppIdFile(join(ASSETS_FOLDER, 'steam_appids.json'))

    const db = mysql.createPool({
        socketPath: process.env.MYSQL_SOCKET_PATH,
        host:       process.env.MYSQL_HOST,
        database:   process.env.MYSQL_DB,
        user:       process.env.MYSQL_USER, 
        password:   process.env.MYSQL_PASSWORD,
        namedPlaceholders: true
    })
    const admindb = mysql.createPool({
        socketPath: process.env.MYSQL_ADMINS_SOCKET_PATH || process.env.MYSQL_SOCKET_PATH,
        host:       process.env.MYSQL_ADMINS_HOST         || process.env.MYSQL_HOST,
        database:   process.env.MYSQL_ADMINS_DB          || process.env.MYSQL_DB,
        user:       process.env.MYSQL_ADMINS_USER        || process.env.MYSQL_USER, 
        password:   process.env.MYSQL_ADMINS_PASSWORD    || process.env.MYSQL_PASSWORD,
        namedPlaceholders: true
    })

    const userManager = new UserManager(db, steam)
    const configManager = new ConfigManager()
    await configManager.Load(DATA_FOLDER)
    const authManager = new AuthManager(admindb, db, steam, configManager)
    const serverManager = new ServerManager(steam, DATA_FOLDER, CONFIG_FOLDER, configManager)
    SetCache.Init(DATA_FOLDER)
    await Promise.all([
        authManager.Init(),
        serverManager.Load()
    ])
    fastify.decorate('users', userManager)
    fastify.decorate('authmngr', authManager)
    fastify.decorate('db', db)
    fastify.decorate('steam', steam)
    fastify.decorate('servers', serverManager)
    fastify.decorate('config', configManager)
    fastify.decorate('managers', {
        discussions: new DiscussionManager(db, configManager, authManager)
    })
    fastify.addHook('preHandler', async (req, reply) => {
        if(req.session?.user) {
            if(req.session.version !== SESSION_VERSION) { 
                req.session.destroy()
                return NOT_LOGGED_IN(reply, "SESSION_EXPIRED", `Session has expired (target:${SESSION_VERSION}, cur:${req.session.version})`)
            }
            req.user = new User(fastify, req.session.user.steamid)
        } else if(req.headers['x-apikey']) {
            const key = Array.isArray(req.headers['x-apikey']) ? req.headers['x-apikey'][0] : req.headers['x-apikey']
            const apikey = await authManager.getAPIKey(key)
            if(apikey)
                req.user = new User(fastify, apikey.steamid)
            else
                return NOT_LOGGED_IN(reply, "INVALID_APIKEY", "Invalid API Key")
        }
    })
    fastify.addHook("onClose", (inst, done) => {
        serverManager.onShutdown()
        console.log("Shutdown complete")
        done()
    })
}
export default FastifyPlugin(db)