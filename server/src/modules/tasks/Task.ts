import { getUnixSeconds } from "./util.js"

export type TaskFunction<T = {}> = (state: T|undefined) => Promise<any>|any

export class Task<T> {
    protected id: string
    protected handler: TaskFunction<T>
    protected created: number
    protected lastRan: number | null = null

    protected state: T | undefined

    constructor(id: string, handler: TaskFunction<T>, defaultState: T | undefined) {
        this.id = id
        this.handler = handler
        this.created = getUnixSeconds()
        this.state = defaultState
    }

    /**
     * Returns the unix seconds from when this task was created
     *
     * @readonly
     */
    get CreatedTimestamp() {
        return this.created
    }

    /**
     * Returns the unix seconds from when this task was last ran, or null if has not ran yet
     *
     * @readonly
     */
    get LastRanTimestamp() {
        return this.lastRan
    }

    get Id(): string {
        return this.id
    }

    async execute() {
        const time = performance.now()
        await this.handler(this.state)
        const duration = performance.now() - time

        this.lastRan = getUnixSeconds()
        return duration
    }
}

let _temp_task_id = 0
export class TempTask<T = {}> extends Task<T> {
    constructor(handler: TaskFunction<T>, defaultState?: T) {
        let id = _temp_task_id++
        super(`_TEMP${id}`, handler, defaultState)
    }
}

export class DefinedTask<T = {}> extends Task<T> {
    constructor(name: string, handler: TaskFunction<T>, defaultState?: T) {
        super(name, handler, defaultState)
    }
}