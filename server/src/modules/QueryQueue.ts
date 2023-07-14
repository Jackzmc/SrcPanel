import { Pool, RowDataPacket } from "mysql2/promise"

interface QueryData {
    state: JobState,
    dataQuery: string,
    countQuery: string,
    dataValues: any[],
    countValues: any[],
    output?: {
        data: any,
        count: any
    }
}

enum JobState {
    Waiting,
    Processing,
    Completed,
    Failed
}

export class QueryQueue {
    private queue: number[] = []
    private operations: Map<number, QueryData>
    private nextInt: number = 0

    private db: Pool

    constructor(pool: Pool) {
        this.operations = new Map()
        this.db = pool
    }

    public get queueCount() { 
        return this.queue.length
    }
    
    public get operationsCount() {
        return this.operations.size
    }

    public add(dataQuery: string, countQuery: string, dataValues: any[], countValues: any[]) {
        const id = this.nextInt++
        this.operations.set(id, {
            state: JobState.Waiting,
            dataQuery,
            countQuery,
            dataValues,
            countValues,
        })
        this.queue.push(id)
        console.log('operations', this.operations.size, Object.fromEntries(this.queue.entries()))
        this._process()
        return id
    }

    public get(id: number) {
        console.log('operations', this.operations.size, Object.fromEntries(this.queue.entries()))
        const operation = this.operations.get(id)
        if(!operation) return null
        // TODO: TTL?
        if(operation.state == JobState.Completed || operation.state == JobState.Failed) this.operations.delete(id)
        return operation
    }

    private async _process() {
        const operationId = this.queue.shift();
        const operation = this.operations.get(operationId)
        if(!operation) return console.error('QueryQueue: No operation found for id', operationId, 'skipping')

        operation.state = JobState.Processing

        const [[data], [count]] = await Promise.all([
            this.db.execute<RowDataPacket[]>(operation.dataQuery, operation.dataValues),
            this.db.execute<RowDataPacket[]>(operation.countQuery, operation.countValues)
        ]);

        operation.output = {
            data,
            count
        }
        operation.state = JobState.Completed
    }
}