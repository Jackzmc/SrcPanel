import mysql from 'mysql2/promise'
import Logger from '#/logger.js'

const log = Logger.child({ name: "db" })

export const MAIN_DB = process.env.MYSQL_DB ?? 'left4dead2'
export const ADMINS_DB = process.env.MYSQL_ADMINS_DB ?? MAIN_DB

export const TABLE_PREFIX = "panel"

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