import { Pool, RowDataPacket } from "mysql2/promise";
import { QueryBuilder } from "./QueryBuilder.js";

async function queryFn(pool: Pool) {
  return {
    async getAll<T extends RowDataPacket = RowDataPacket>(sql: string, values: any[]): Promise<{
      rows: T[],
      timeTaken: number
    }> {
      const timeStart = performance.now()
      const [rows] = await pool.query<RowDataPacket[]>(sql, values)
      const timeTaken = performance.now() - timeStart
      return {
        rows: rows as T[],
        timeTaken
      }
    },
    async getOne<T extends RowDataPacket = RowDataPacket>(sql: string, values: any[]): Promise<{
      row: T | null,
      timeTaken: number
    }> {
      const timeStart = performance.now()
      const [rows] = await pool.query<RowDataPacket[]>(sql, values)
      const timeTaken = performance.now() - timeStart
      return {
        row: rows.length > 0 ? rows[0] as T : null,
        timeTaken
      }
    }
  }
}

export interface DataManagerInstance {
  pool: {
    query: ReturnType<typeof queryFn>
    builder: typeof QueryBuilder
  }
}

let _instance: DataManagerInstance

export function create(pool: Pool) {
  _instance = {
    pool: {
      query: queryFn(pool),
      builder: QueryBuilder
    }
  }
  return _instance
}

export function getInstance() {
  if (!_instance) throw new Error("DataManager not initialized")
  return _instance
}

export default { create, getInstance }
