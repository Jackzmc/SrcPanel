import Logger from '#/logger.js'
import AuthManager from '../modules/auth/AuthManager.js';

import mysql from 'mysql2/promise'
import { mkdir } from 'fs/promises'
import UserManager from '../modules/users/UserManager.js';
import { join } from 'path';

import ServerManager from '../modules/servers/ServerManager.js';
import SteamAPI from '../modules/steam.js'
import ConfigManager from '../modules/ConfigManager.js';
import DiscussionManager from '../modules/DiscussionManager.js';
import TaskManager from '../modules/tasks/TaskManager.js';
import CacheManager from '../modules/CacheManager.js';
import DataManager from '../modules/DataManager.js'

import * as PromMetrics from './prom-metrics.js'
import NotesManager from '../modules/notes/index.js';
import PlayerManager from '../modules/users/PlayerManager.js';

const log = Logger.child({ name: "core" })

export const MAIN_DB = process.env.MYSQL_DB ?? 'left4dead2'
export const ADMINS_DB = process.env.MYSQL_ADMINS_DB ?? MAIN_DB

export const TABLE_PREFIX = "panel"

export const DATA_FOLDER = join(import.meta.dirname, '/../../../data')
export const CACHE_FOLDER = join(DATA_FOLDER, "cache")
export const CONFIG_FOLDER = join(import.meta.dirname, '/../../../config')

export default async function init() {
    log.debug('data %s', DATA_FOLDER)
    log.debug('config %s', CONFIG_FOLDER)
    log.debug('cache %s', CACHE_FOLDER)

    await PromMetrics.register()

    await tryMkdir(DATA_FOLDER)
    await tryMkdir(CACHE_FOLDER)

    const db = await loadDB()
    const modules = await loadModules(db)

    log.info("core initialized")

    return {
        db,
        modules
    }
}

export type CoreModules = Awaited<ReturnType<typeof init>>

const shutdownFunctions: (() => Promise<void>)[] = []

export async function loadModules(db: Awaited<ReturnType<typeof loadDB>>) {
    const cacheManager = await CacheManager.Create(CACHE_FOLDER)
    const steam = new SteamAPI(cacheManager)

    const jobScheduler = new TaskManager({ resolution: 1000 * 60 * 2 }) // Run every 2 minutes
    const userManager = new UserManager(db.db, steam)
    const configManager = await ConfigManager.Load(CONFIG_FOLDER)
    const authManager = new AuthManager(db.admindb, db.db, steam, configManager, cacheManager)
    const serverManager = new ServerManager(steam, DATA_FOLDER, CONFIG_FOLDER)
    const discussions = new DiscussionManager(db.db, configManager, authManager, jobScheduler)
    const dataManager = DataManager.create(db.db)
    const notesManager = new NotesManager(db.db)

    const [ playerManager ] = await Promise.all([
        await PlayerManager.create(db.db, authManager),
        authManager.Init(),
        serverManager.Load(),
    ])

    shutdownFunctions.push(
        async() => await playerManager.onShutdown(),
        async() => await serverManager.onShutdown(),
    )

    return {
        cacheManager,
        dataManager,
        steam,
        jobScheduler,
        userManager,
        configManager,
        authManager,
        serverManager,
        discussions,
        notesManager,
        playerManager
    }
}

export async function onCoreShutdown() {
    const promises = shutdownFunctions.map(fn => fn())
    await Promise.all(promises)
}


export async function loadDB() {
    const db = mysql.createPool({
        socketPath: process.env.MYSQL_SOCKET_PATH,
        host: process.env.MYSQL_HOST,
        database: MAIN_DB,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        namedPlaceholders: true
    })
  const admindb = mysql.createPool({
        socketPath: process.env.MYSQL_ADMINS_SOCKET_PATH || process.env.MYSQL_SOCKET_PATH,
        host: process.env.MYSQL_ADMINS_HOST || process.env.MYSQL_HOST,
        database: ADMINS_DB,
        user: process.env.MYSQL_ADMINS_USER || process.env.MYSQL_USER,
        password: process.env.MYSQL_ADMINS_PASSWORD || process.env.MYSQL_PASSWORD,
        namedPlaceholders: true
  })
  return { db, admindb }
}

/**
 * Tries to create a directory, does not error if exists
 * @param dir directory to create
 */
async function tryMkdir(dir: string) {
  try {
    await mkdir(dir)
  } catch (e: any) {
    if (e.code !== "EEXIST") throw e
  }
}