import mysql, { type Connection, type Pool } from 'mysql2/promise'
import Logger from '#/util/logger.js'

const log = Logger.child({ name: "db" })

export const MAIN_DB = process.env.MYSQL_DB ?? 'left4dead2'
export const ADMINS_DB = process.env.MYSQL_ADMINS_DB ?? MAIN_DB

export const TABLE_PREFIX = "panel"

export type DBPool = Pool
export type DBConn = Connection
export type DBClient = Pool | Connection

export async function loadDB() {
  const db = mysql.createPool({
      uri: process.env.DB_URI,
      socketPath: process.env.MYSQL_SOCKET_PATH,
      host: process.env.MYSQL_HOST,
      database: MAIN_DB,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      namedPlaceholders: true
  })
  const admindb = mysql.createPool({
      uri: process.env.DB_URI,
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
 * Wrapper that begins a transaction, runs the passed handler, and commits on success or rollbacks on error
 * NOTE: You must use the connection passed to the handler
 * @param db pool / connection instance
 * @param fn function that performs SQL statements and gets access to the connection performing the transaction
 * @param args any args to pass to fn
 */
export async function doTransaction<T = void>(db: DBPool, fn: (conn: DBConn, ...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
  const conn = await db.getConnection()
  await conn.beginTransaction()
  try {
    const v = await fn(conn, ...args)
    await conn.commit()
    return v
  } catch(err) {
    await conn.rollback()
    throw err
  } finally {
    await conn.release()
  }
}