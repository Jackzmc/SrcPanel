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
import TaskManager from '../modules/tasks/TaskManager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Tries to create a directory, does not error if exists
 * @param dir directory to create
 */
async function tryMkdir(dir: string) {
    try {
        await mkdir(dir)
    } catch(e) {
        if(e.code !== "EEXIST") throw e
    }
}

async function db(fastify: FastifyInstance) {
    const ASSETS_FOLDER = join(__dirname, '/../../../../assets')
    const DATA_FOLDER = join(__dirname, '/../../../../data')
    const CACHE_FOLDER = join(DATA_FOLDER, "cache")
    const CONFIG_FOLDER = join(__dirname, '/../../../../config')
    fastify.log.debug('assets %s', ASSETS_FOLDER)
    fastify.log.debug('data %s', DATA_FOLDER)
    fastify.log.debug('config %s', CONFIG_FOLDER)
    await tryMkdir(DATA_FOLDER)
    await tryMkdir(CACHE_FOLDER)
    
    const steam = new SteamAPI()
    await steam.InitCache(CACHE_FOLDER)
    await steam.getAppName(550)
    // await steam.loadAppIdFile(join(CACHE_FOLDER, 'steam_appids.json'))

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
        host:       process.env.MYSQL_ADMINS_HOST        || process.env.MYSQL_HOST,
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
    const jobScheduler = new TaskManager({ resolution: 1000 * 60 * 2 }) // Run every 2 minutes
    fastify.decorate('users', userManager)
    fastify.decorate('authmngr', authManager)
    fastify.decorate('db', db)
    fastify.decorate('steam', steam)
    fastify.decorate('servers', serverManager)
    fastify.decorate('config', configManager)
    fastify.decorate('jobs', jobScheduler)
    fastify.decorate('managers', {
        discussions: new DiscussionManager(fastify)
    })
    fastify.addHook('preHandler', async (req, reply) => {
        if(req.session?.user) {
            if(req.session.version !== SESSION_VERSION) { 
                req.session.destroy()
                return NOT_LOGGED_IN(reply, "SESSION_EXPIRED", `Session has expired (target:${SESSION_VERSION}, cur:${req.session.version})`)
            }
            req.user = new User(fastify, req.session.user.steamid)
        } else if(req.headers['x-apikey'] || req.headers['authorization']) {
            let token: string;
            if(req.headers['authorization']) {
                const split = req.headers['authorization'].split(" ")
                if(split.length == 2 && split[0] == "Bearer") token = split[1]
                else return NOT_LOGGED_IN(reply, "INVALID_APIKEY", "Invalid token or token type, must be Bearer <token>")
            } else if(typeof req.headers['x-apikey'] == 'string' ) {
                token = req.headers['x-apikey']
            } else {
                return NOT_LOGGED_IN(reply, "INVALID_APIKEY", "Missing or invalid x-apikey or authorization header")
            }
            const apikey = await authManager.getAPIKey(token)
            if(apikey)
                req.user = new User(fastify, apikey.steamid)
        }
    })
    fastify.addHook("onClose", (inst, done) => {
        serverManager.onShutdown()
        fastify.log.info("Shutdown complete")
        done()
    })
}
export default FastifyPlugin(db)