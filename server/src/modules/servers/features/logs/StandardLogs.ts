import { open, stat } from 'fs/promises'
import Logs from "./Console.js";
import { Tail } from "tail";
import Server from "../../Server.js";
import { resolve } from "path";

export default class StandardLogs extends Logs {
    #logPath: string
    #available: boolean

    constructor(server: Server, logPath: string) {
        super(server)
        this.#logPath = logPath
    }

    get available() {
        return this.#available
    }

    async init() {
        if(!this.#logPath) return
        try {
            const path = resolve(this.#logPath)
            await stat(path)
            this.#available = true
        } catch(err) {
            if(err.code === "ENOENT")
                console.error(`[Server/${this._server.id}] ERROR: Log file does not exist at ${this.#logPath}; skipping`)
            else throw err
            this.#available = false
        }

        await this.readExisting()
        await this.#createLogsReader()
    }

    public get logs() { 
        return [...this._lines.map(line => line.content)]
    }


    /** Reads all lines from start to end, keeping only last MAX_BUFFER_LINES */
    async readExisting() {
        // Read previous lines
        const file = await open(this.#logPath, "r")
        if(!file) return console.warn(`[Server/${this._server.id}] Warn: Cannot open log file ${this.#logPath}`)
        for await (const line of file.readLines()) {
            this.pushLine(line)
        }
        await file.close()
    }

    /**
     * Returns a tail stream (live-view) of server's console logs
     * @returns 
     */
    async #createLogsReader() { 
      // Subscribe to new:
      const tail = new Tail(this.#logPath)
      tail.on('line', (line) => this.pushLine(line))
      tail.on("error", (err) => {
        console.warn(`[Server/${this._server.id}] WARN: Log file stream errored.\n`, err)
      })
      return tail
    }
}
