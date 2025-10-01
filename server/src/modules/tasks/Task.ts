import { getUnixSeconds } from "./util.js"

export type TaskFunction<T = object> = (state: T|undefined) => Promise<any>|any
export type NextDateFunction = (prevRunDate: Date) => Date | null

export class Task<T> {
    protected nextRun: Date | null = null
    protected getNextRunDate: NextDateFunction | null = null
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
     * Returns when this task will run next, if scheduled.
     *
     * @readonly
     */
    get NextRunDate() {
        return this.nextRun
    }

    /**
     * Returns if this task is scheduled and will repeat
     *
     * @readonly
     */
    get IsRepeating() {
        return this.nextRun != null && this.getNextRunDate != null
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

    setSchedule(nextRun: Date, nextRunFn: NextDateFunction | null) {
        this.nextRun = nextRun
        this.getNextRunDate = nextRunFn
    }

    /**
     * Sets the next scheduled run date - if repeat function is enabled.
     * @returns bool - TRUE if scheduled false if not scheduled
     */
    reschedule() {
        if(this.getNextRunDate && this.nextRun) {
            this.nextRun = this.getNextRunDate(this.nextRun)
            return true
        }
        return false
    }

    toJSON() {
        return {
            id: this.Id,
            created: this.CreatedTimestamp,
            lastRan: this.LastRanTimestamp,
            nextRun: this.NextRunDate,
            isRepeating: this.IsRepeating
        }
    }
}

let _temp_task_id = 0
export class TempTask<T = object> extends Task<T> {
    constructor(handler: TaskFunction<T>, defaultState?: T) {
        const id = _temp_task_id++
        super(`_TEMP${id}`, handler, defaultState)
    }
}

export class DefinedTask<T = object> extends Task<T> {
    constructor(name: string, handler: TaskFunction<T>, defaultState?: T) {
        super(name, handler, defaultState)
    }
}