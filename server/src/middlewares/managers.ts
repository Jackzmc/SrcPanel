import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import FastifyPlugin from 'fastify-plugin'
import AuthManager from '../modules/AuthManager.js';

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
import { QueryQueue } from '../modules/QueryQueue.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function db(fastify: FastifyInstance) {
    const DATA_FOLDER = join(__dirname, '/../../../../data')
    const CONFIG_FOLDER = join(__dirname, '/../../../../config')
    try {
        await mkdir(DATA_FOLDER)
    } catch(_) { }
    
    const steam = new SteamAPI()
    await steam.loadAppIdFile('assets/steam_appids.json')

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
    const authManager = new AuthManager(admindb, db, steam)
    const configManager = new ConfigManager()
        await configManager.Load(DATA_FOLDER)
    fastify.decorate('users', userManager)
    fastify.decorate('authmngr', authManager)
    fastify.decorate('db', db)
    fastify.decorate('steam', steam)
    fastify.decorate('servers', new ServerManager(steam, DATA_FOLDER, CONFIG_FOLDER, configManager))
    fastify.decorate('config', configManager)
    fastify.decorate('jobs', new QueryQueue(db))
    fastify.addHook('preHandler', (req, reply, done) => {
        if(req.session?.user) {
            if(req.session.version !== SESSION_VERSION) { 
                req.session.destroy()
                return NOT_LOGGED_IN(reply, "SESSION_EXPIRED", `Session has expired (target:${SESSION_VERSION}, cur:${req.session.version})`)
            }
            req.user = new User(authManager, req.session.user.steamid)
        }
        done()
    })
}
export default FastifyPlugin(db)