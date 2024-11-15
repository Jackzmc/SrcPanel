import Server from "../../Server.js"
import Feature from "../Feature.js"

/** The maximum number of lines to keep buffered */
const MAX_BUFFER_LINES = 100

export type LineCallback = (line: string) => void

export default abstract class Logs extends Feature {
    protected _lines: string[] = []
    #subscribers: LineCallback[] = []

    constructor(server: Server) {
        super("Console", server)
    }

    abstract init(): Promise<void>;

    abstract get logs(): string[]

    abstract readExisting(): Promise<void>;

    subscribe(cb: LineCallback) {
        this.#subscribers.push(cb)
    }

    unsubscribe(cb: LineCallback) {
        const index = this.#subscribers.findIndex(v => v === cb)
        if(index > -1) {
            this.#subscribers.splice(index, 1)
        }
        return index
    }

    /**
     * Number of subscribers to log stream
     *
     * @readonly
     * @memberof Console
     */
    get subscribers() { return this.#subscribers.length }

    
    /** Adds a line to the logs buffer, keeping only MAX_BUFFER_LINES recent entries
     * 
     * @param line the line to add 
     */
    public pushLine(line: string) {
        this._lines.push(line)
        if(this._lines.length > MAX_BUFFER_LINES) {
            this._lines.splice(0, 1)
        }
        for(const subCb of this.#subscribers) {
            subCb(line)
        }
    }
}