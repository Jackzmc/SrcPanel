import { FastifyInstance } from 'fastify';
import FastifyPlugin from 'fastify-plugin'
import AuthManager from '../modules/AuthManager.js';

import mysql from 'mysql2/promise'

async function db(fastify: FastifyInstance, opts) {
    const db = mysql.createPool({
        socketPath: process.env.MSQL_SOCKET_PATH,
        host:     process.env.MYSQL_HOST   || 'localhost', 
        database: process.env.MYSQL_DB,
        user:     process.env.MYSQL_USER, 
        password: process.env.MYSQL_PASSWORD,
        namedPlaceholders: true
    })
    const admindb = await mysql.createPool({
        socketPath: process.env.MSQL_SOCKET_PATH,
        host:     process.env.MYSQL_HOST   || 'localhost', 
        database: process.env.MYSQL_ADMINS_DB,
        user:     process.env.MYSQL_USER, 
        password: process.env.MYSQL_PASSWORD,
        namedPlaceholders: true
    })

    const authmanager = new AuthManager(admindb, db)
    fastify.decorate('authmngr', authmanager)
    fastify.decorate('db', db)
}

export default FastifyPlugin(db)