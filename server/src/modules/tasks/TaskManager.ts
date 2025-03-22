import { DefinedTask, Task, TaskFunction, TempTask } from "./Task.js"
import { calculateDate, TimeOptions } from "./util.js"


interface ScheduleEntry {
    nextRun: Date
    // Calculates when it should run next. If never ran, prevRunDate will be date the task was created.
    // Return of null ends the scheduling
    getNextRunDate: (prevRunDate: Date) => Date | null,
}

interface TaskManagerOptions {
    /** The resolution of the schedule timer. This is how often tasks are evaluated to be run.
    * Default is 1000 ms / 1 s
    */
    resolution?: number,
    /** The number of tasks that run in a single schedule tick / iteration
    * Default is 1 tasks per iteration
    */
    tasksPerTick?: number
}

export default class TaskManager {
    static #instance: TaskManager
    static get Instance() {
        return this.#instance
    }

    #tasks: Task<unknown>[]
    #schedule: Map<Task<unknown>, ScheduleEntry>
    #timer: NodeJS.Timeout

    constructor(options: TaskManagerOptions = {}) {
        TaskManager.#instance = this
        this.#tasks = []
        this.#schedule = new Map()
        const tasksPerTick = options.tasksPerTick ?? 1
        this.#timer = setInterval(async () => {
            const now = new Date()
            let count = 0
            for(const [task, entry] of this.#schedule.entries()) {
                // console.debug({ id: task.Id, now: now, nextRun: entry.nextRun, nextNextRun: entry.getNextRunDate(entry.nextRun), compare: now >= entry.nextRun })
                if(now >= entry.nextRun) {
                    count++
                    console.info(`[TaskManager] Running task \"${task.Id}\" [${count}/${tasksPerTick}]`)
                    await task.execute() // TODO: error handling?
                    const nextRun = entry.getNextRunDate(entry.nextRun)
                    if(nextRun) {
                        entry.nextRun = nextRun
                    } else {
                        // No next date - task is over
                        this.#schedule.delete(task)
                    }

                    // Limit # of tasks in a tick
                    if(count >= tasksPerTick)
                        break
                }
            }
        }, options.resolution ?? 1000)
    }
    
    /**
     * Terminates the scheduler timer, ending any manager's scheduled work
     */
    terminate() {
        clearInterval(this.#timer)
    }

    register<T = {}>(name: string, fn: TaskFunction<T>, defaultState?: T | undefined) {
        if(this.get(name) != undefined) throw new Error("Task already registered")
        const task = new DefinedTask<T>(name, fn, defaultState)
        console.debug(`[TaskManager] Registered task \"${name}\"`)
        this.#tasks.push(task)
        return task
    }

    registerTemp<T = {}>(fn: TaskFunction<T>, defaultState?: T | undefined) {
        return new TempTask<T>(fn, defaultState)
    }

    unregister<T>(nameOrTask: string | Task<T>) {
        let task: Task<T>
        if(nameOrTask instanceof Task) {
            task = nameOrTask 
        } else {
            const checkTask = this.get(nameOrTask)
            if(!checkTask) return

            task = checkTask as Task<T> // convert DefinedTask -> Task
        }
        this.#schedule.delete(task)
        const taskIndex = this.#tasks.findIndex(findTask => findTask.Id != task.Id)
        if(taskIndex != -1) {
            this.#tasks.splice(taskIndex, 1)
        }
    }

    getNamedTasks(): DefinedTask[] {
        return this.#tasks.filter(task => task instanceof DefinedTask)
    }

    /** Returns a task by name (excluding TempTask) if exists */
    get(name: string) {
        return this.getNamedTasks().find(task => task.Id === name)
    }

    get TaskCount() { return this.#tasks.length }
    get NamedTaskCount() { return this.getNamedTasks().length }
    get ScheduledTaskCount() { return this.#schedule.size }
    
    /**
     * Schedules a task to run once, relative from task creation date
     * @param {Task} task The task to run
     * @param {TimeOptions} timeOptions The relative amount of time for the next run
     * @return {Date}  {Date} The date provided when it will run
     */
    schedule(task: Task<unknown>, timeOptions: TimeOptions): Date
    /**
     * Schedules a task to run on a specific date
     * @param {Task} task The task to run
     * @param {Date} date The date to run on
     * @return {Date}  {Date} The date provided when it will run
     */
    schedule(task: Task<unknown>, date: Date): Date
    /**
     * Schedules a task to run once
     * @param task The task to run
     * @param dateOrTime the TimeOptions or Date to run at
     * @returns the date of the next execution
     */
    schedule(task: Task<unknown>, dateOrTime: TimeOptions | Date): Date {
        const startDate = new Date(task.CreatedTimestamp * 1000)
        if(!(dateOrTime instanceof Date)) {
            dateOrTime = calculateDate(startDate, dateOrTime)
        }
        console.debug(`[TaskManager] Scheduled \"${task.Id}\" for ${dateOrTime}`)
        this.#schedule.set(task, {
            nextRun: dateOrTime,
            // Does not repeat, return null
            getNextRunDate: (_) => null
        })
        return dateOrTime
    }

    /**
     * Schedules a task to run repeately, relative from task creation date
     * @param {Task} task The task to run
     * @param {TimeOptions} timeOptions The relative amount of time for the next run
     * @return {Date}  {Date} The date provided when it will first run
     */
    scheduleRepeating(task: Task<unknown>, timeOptions: TimeOptions): Date {
        const startDate = new Date(task.CreatedTimestamp * 1000)
        const nextRun = calculateDate(startDate, timeOptions)
        console.debug(`[TaskManager] Scheduled repeating \"${task.Id}\" for ${JSON.stringify(timeOptions)}`)
        this.#schedule.set(task, {
            nextRun,
            getNextRunDate: (prevRunDate) => calculateDate(prevRunDate, timeOptions) 
        })
        return nextRun
    }
    
}

function test() {
    const tasks = new TaskManager()
    const task = tasks.register("resolve_names", () => {
        //...
    })
    tasks.schedule(task, { minutes: 30 })
}