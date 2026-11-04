import { FieldPacket, Pool, RowDataPacket } from 'mysql2/promise'
import type { DBClient } from '../core/database.js'
export enum SortDirection {
    Ascending,
    Descending
}
export type Condition = "<" | ">" | "<=" | ">=" | "=" | "LIKE" | "!="
type JoinType = "LEFT" | "RIGHT" | "OUTER" | "INNER" | "" 
interface Join {
    type: JoinType,
    table: string,
    alias?: string,
    leftColumn: string,
    rightColumn: string,
    condition: Condition,
    unsafe?: boolean
}
type QueryType = "SELECT" | "UPDATE" | "DELETE" | "INSERT INTO"
type WhereCondition = [string, Condition, any]
interface WhereConditionInternal {
    conditions: string[],
    data: any[]
}
/**
 * Utility to build queries with dynamic data. 
 * Only supports select conditions
 */
export class QueryBuilder {
    #tableName: string
    #tableAlias?: string
    #data: any[] = []
    #sorts: Record<string, SortDirection> = {}
    #whereConditions: string[] = []
    #orConditions: WhereConditionInternal[] = []
    #whereData: any[] = []
    #limit?: [string, number, number?]
    #selects: string[][] = []
    #joins: Join[] = []
    #partition?: string | null = null
    #type: QueryType

    /**
     * Starts a SELECT statement
     * @deprecated publically use startSelect()
     */
    constructor(tableName: string, tableAlias?: string, type: QueryType = "SELECT") {
        this.#tableName = tableName
        this.#tableAlias = tableAlias
        this.#type = type
        // "SERVER IN (?, ?, ?)
    }

    /**
     * Starts a SELECT statement
     * @param tableName table to select FROM
     * @param tableAlias optional alias to add
     */
    static startSelect(tableName: string, tableAlias?: string) {
        return new QueryBuilder(tableName, tableAlias, "SELECT")
    }

    // static startUpdate(tableName: string, tableAlias?: string) {
    //     return new QueryBuilder(tableName, tableAlias, "UPDATE")
    // }


    partition(partition?: string | null) {
        this.#partition = partition
        return this
    }

    
    selectMultiple(...column: string[]) {
        this.#selects = [...this.#selects, ...column.map(col => [escapeId(col)])]
        return this
    }

    select(column: string, alias?: string) {
        const select = [escapeId(column)]
        if(alias) select.push(alias)
        this.#selects.push(select)
        return this
    }

    #buildSelect() {
        return this.#selects.map(data => {
            if(data[1]) return `${data[0]} AS ${data[1]}`
            else return data[0]
        })
    }

    leftJoin(table: string, leftColumn: string, condition: Condition, rightColumn: string, alias?: string, unsafe = false) {
        this.#addJoin("LEFT", {
            table,
            leftColumn,
            condition,
            rightColumn,
            alias,
            unsafe
        })
        return this
    }

    rightJoin(table: string, leftColumn: string, condition: Condition, rightColumn: string, alias?: string, unsafe = false) {
        this.#addJoin("RIGHT", {
            table,
            leftColumn,
            condition,
            rightColumn,
            alias,
            unsafe
        })
        return this
    }

    innerJoin(table: string, leftColumn: string, condition: Condition, rightColumn: string, alias?: string, unsafe = false) {
        this.#addJoin("INNER", {
            table,
            leftColumn,
            condition,
            rightColumn,
            alias,
            unsafe
        })
        return this
    }

    outerJoin(table: string, leftColumn: string, condition: Condition, rightColumn: string, alias?: string, unsafe = false) {
        this.#addJoin("OUTER", {
            table,
            leftColumn,
            condition,
            rightColumn,
            alias,
            unsafe
        })
        return this
    }

    join(table: string, leftColumn: string, condition: Condition, rightColumn: string, alias?: string, unsafe = false) {
        this.#addJoin("", {
            table,
            leftColumn,
            condition,
            rightColumn,
            alias,
            unsafe
        })
        return this
    }

    #addJoin(type: JoinType, joinData: Omit<Join, 'type'>) {
        this.#joins.push({
            ...joinData,
            type
        })
    }

    #buildJoins() {
        return this.#joins.map(joinData => {
            const name = joinData.alias ?? joinData.table
            if(!joinData.unsafe) {
                joinData.leftColumn = escapeId(joinData.leftColumn)
                joinData.rightColumn = escapeId(joinData.rightColumn)
            }
            return `${joinData.type} JOIN ${escapeId(joinData.table)} ${joinData.alias} ON ${name}.${joinData.leftColumn} ${joinData.condition} ${joinData.rightColumn}`
            
        }).join(" ")
    }

    /**
     * A collection of where conditions
     * @param conditions 
     */
    or(conditions: WhereCondition[]) {
        const cond: WhereConditionInternal = {
            conditions: [],
            data: []
        }
        for(const condition of conditions) {
            cond.conditions.push(`${escapeId(condition[0])} ${condition[1]} ?`)
            cond.data.push(condition[2])
        }
        this.#orConditions.push(cond)
    }

    /**
     * Adds a where condition
     * @param column the column to check
     * @param condition the condition to use
     * @param value value to compare to
     * @returns 
     */
    where(column: string, condition: Condition, value: any) {
        this.#whereConditions.push(`${escapeId(column)} ${condition} ?`)
        this.#whereData.push(value)
        return this
    }

    whereIn(column: string, values: any[]) {
        this.#whereConditions.push(`${escapeId(column)} IN (${generateParams(values.length)})`)
        this.#whereData = [ ...this.#whereData, ...values ]
        return this
    }

    clearWhere() {
        this.#whereConditions = []
        this.#whereData = []
        return this
    }

    #buildWhere() {
        this.#data = [...this.#data, ...this.#whereData]
        if(this.#whereConditions.length === 0) return ""
        let str = `WHERE ${this.#whereConditions.join(" AND ")}`
        if(this.#orConditions.length > 0) {
            str += ` OR (${this.#orConditions.map(c => c.conditions).join(" AND ")})`
            for(const cond of this.#orConditions) {
                this.#data = [...this.#data, ...cond.data]
            }
        }
        return str
    }

    sort(column: string, sortDirection = SortDirection.Ascending) {
        this.#sorts[column] = sortDirection
        return this
    }

    sortMultiple(columns: Record<string, SortDirection>) {
        for(const [k, v] of Object.entries(columns)) {
            this.#sorts[k] = v
        }
        return this
    }

    #buildSort(): string {
        if(Object.keys(this.#sorts).length === 0) return ""
        const sortPieces: string[] = []
        for(const [column, dir] of Object.entries(this.#sorts)) {
            sortPieces.push(`${escapeId(column)} ${dir == SortDirection.Ascending ? 'ASC' : 'DESC'}`)
        }
        return `ORDER BY ${sortPieces.join(', ')}`
    }

    limit(limit: number, offset?: number) {
        if(limit == undefined || isNaN(limit)) throw Error("limit is not defined or invalid")
        if(offset != undefined) {
            this.#limit = ["LIMIT ?, ?", Number(limit), Number(offset)]
        } else {
            this.#limit = ["LIMIT ?", Number(limit)]
        }
        return this
    }

    #buildLimit() {
        if(!this.#limit) return ""
        this.#data = [...this.#data, ...this.#limit.slice(1)]
        return this.#limit[0]
    }

    /**
     * Builds a query with placeholders. Returns query and all data.
     * You may want to call <see>execute()</see> instead
     * @returns [ query, data[] ]
     */
    build(): [ string, any[] ] {
        const tablePrefix = this.#tableAlias ? `AS ${this.#tableAlias}` : ''
        const partitionString = this.#partition ? `PARTITION (${this.#partition})` : ''
        return [
            `SELECT ${this.#buildSelect()} FROM ${escapeId(this.#tableName)} ${partitionString} ${tablePrefix} ${this.#buildJoins()} ${this.#buildWhere()} ${this.#buildSort()} ${this.#buildLimit()}`,
            this.#whereData
        ]
    }

    /**
     * Builds the query by manually replacing placeholders with their value.
     * Values are NOT escaped.
     * DO NOT USE. It for viewing what the query should maybe be
     * @returns raw query
     */
    buildUnsafe() {
        let [query] = this.build()
        for(let data of this.#data) {
            if(typeof data === "string") {
                data = `'${data}'`
            }
            query = query.replace(/\?/, data)
        }
        this.#data = []
        return query
    }

    async execute(pool: DBClient): Promise<[RowDataPacket[], FieldPacket[]]> {
        const [query, data] = this.build()
        const result = await pool.execute<RowDataPacket[]>(query, data)
        this.#data = []
        return result
    }

}

const ESCAPE_REGEX = new RegExp(/([^a-zA-Z_.0-9])/g)
export function escapeId(id: string) {
    const pieces = id.split(".")
    return pieces.map(_escapeId).join(".")
}

function _escapeId(id: string) {
    return `\`${(id.replace(ESCAPE_REGEX, ''))}\``
}

export function generateParams(length: number) {
    return Array(length).fill(`?`).join(",")
}