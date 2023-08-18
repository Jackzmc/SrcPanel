import { FieldPacket, Pool, RowDataPacket } from 'mysql2/promise'
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
export class QueryBuilder {
    private _tableName: string
    private _tableAlias: string
    private _data: any[] = []
    private _sorts: Record<string, SortDirection> = {}
    private _whereConditions: string[] = []
    private _whereData: any[] = []
    private _limit: [string, number, number?]
    private _selects: string[][] = []
    private _joins: Join[] = []

    constructor(tableName: string, tableAlias?: string) {
        this._tableName = tableName
        this._tableAlias = tableAlias
        // "SERVER IN (?, ?, ?)
    }
    
    selectMultiple(...column: string[]) {
        this._selects = [...this._selects, ...column.map(col => [escapeId(col)])]
        return this
    }

    select(column: string, alias?: string) {
        this._selects.push([escapeId(column), alias])
        return this
    }

    private _buildSelect() {
        return this._selects.map(data => {
            if(data[1]) return `${data[0]} AS ${data[1]}`
            else return data[0]
        })
    }

    leftJoin(table: string, leftColumn: string, condition: Condition, rightColumn: string, alias?: string, unsafe = false) {
        this._addJoin("LEFT", {
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
        this._addJoin("RIGHT", {
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
        this._addJoin("INNER", {
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
        this._addJoin("OUTER", {
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
        this._addJoin("", {
            table,
            leftColumn,
            condition,
            rightColumn,
            alias,
            unsafe
        })
        return this
    }

    private _addJoin(type: JoinType, joinData: Omit<Join, 'type'>) {
        this._joins.push({
            ...joinData,
            type
        })
    }

    private _buildJoins() {
        return this._joins.map(joinData => {
            const name = joinData.alias ?? joinData.table
            if(!joinData.unsafe) {
                joinData.leftColumn = escapeId(joinData.leftColumn)
                joinData.rightColumn = escapeId(joinData.rightColumn)
            }
            return `${joinData.type} JOIN ${escapeId(joinData.table)} ${joinData.alias} ON ${name}.${joinData.leftColumn} ${joinData.condition} ${joinData.rightColumn}`
            
        }).join(" ")
    }

    where(column: string, condition: Condition, value: any) {
        this._whereConditions.push(`${escapeId(column)} ${condition} ?`)
        this._whereData.push(value)
        return this
    }

    whereIn(column: string, values: any[]) {
        this._whereConditions.push(`${escapeId(column)} IN (${generateParams(values.length)})`)
        this._whereData = [ ...this._whereData, ...values ]
        return this
    }

    clearWhere() {
        this._whereConditions = []
        this._whereData = []
        return this
    }

    private _buildWhere() {
        this._data = [...this._data, ...this._whereData]
        if(this._whereConditions.length === 0) return ""
        return `WHERE ${this._whereConditions.join(" AND ")}`
    }

    sort(column: string, sortDirection = SortDirection.Ascending) {
        this._sorts[column] = sortDirection
        return this
    }

    sortMultiple(columns: Record<string, SortDirection>) {
        for(const [k, v] of Object.entries(columns)) {
            this._sorts[k] = v
        }
        return this
    }

    private _buildSort(): string {
        if(Object.keys(this._sorts).length === 0) return ""
        const sortPieces = []
        for(const [column, dir] of Object.entries(this._sorts)) {
            sortPieces.push(`${escapeId(column)} ${dir == SortDirection.Ascending ? 'ASC' : 'DESC'}`)
        }
        return `ORDER BY ${sortPieces.join(', ')}`
    }

    limit(limit: number, offset?: number) {
        if(limit == undefined || isNaN(limit)) throw Error("limit is not defined or invalid")
        if(offset != undefined) {
            this._limit = ["LIMIT ?, ?", Number(limit), Number(offset)]
        } else {
            this._limit = ["LIMIT ?", Number(limit)]
        }
        return this
    }

    private _buildLimit() {
        if(!this._limit) return ""
        this._data = [...this._data, ...this._limit.slice(1)]
        return this._limit[0]
    }

    build() {
        const tablePrefix = this._tableAlias ? `AS ${this._tableAlias}` : ''
        return `SELECT ${this._buildSelect()} FROM ${escapeId(this._tableName)} ${tablePrefix} ${this._buildJoins()} ${this._buildWhere()} ${this._buildSort()} ${this._buildLimit()}`
    }

    buildUnsafe() {
        let query = this.build()
        for(let data of this._data) {
            if(typeof data === "string") {
                data = `'${data}'`
            }
            query = query.replace(/\?/, data)
        }
        this._data = []
        return query
    }

    async execute(pool: Pool): Promise<[RowDataPacket[], FieldPacket[]]> {
        const result = await pool.execute<RowDataPacket[]>(this.build(), this._data)
        this._data = []
        return result
    }

}

const ESCAPE_REGEX = new RegExp(/([^a-zA-Z_\.0-9])/g)
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