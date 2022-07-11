import { FastifyInstance } from 'fastify';
import FastifyPlugin from 'fastify-plugin'
import AuthManager from '../modules/AuthManager.js';

import mysql from 'mysql2/promise'
import sqlite from 'sqlite'
import sqlite3 from 'sqlite3'
import { mkdir } from 'fs/promises'
import UserManager from '../modules/users/UserManager.js';
async function db(fastify: FastifyInstance) {
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
        host:       process.env.MYSQL_ADMINSHOST         || process.env.MYSQL_HOST,
        database:   process.env.MYSQL_ADMINS_DB          || process.env.MYSQL_DB,
        user:       process.env.MYSQL_ADMINS_USER        || process.env.MYSQL_USER, 
        password:   process.env.MYSQL_ADMINS_PASSWORD    || process.env.MYSQL_PASSWORD,
        namedPlaceholders: true
    })
    try {
    await mkdir('../../data/')
    } catch(_) { }
    const userDb = await sqlite.open({
        filename: '../../data/name_cache.db',
        driver: sqlite3.Database
    })
    const usermanager = new UserManager(userDb)
    fastify.decorate('users', usermanager)
    const authmanager = new AuthManager(admindb, db)
    fastify.decorate('authmngr', authmanager)
    fastify.decorate('db', db)
}

export default FastifyPlugin(db)