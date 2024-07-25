import { resolve } from "path";
import Server from "./Server.js";
import { statSync } from "fs";
import { open } from 'fs/promises'
import { Tail } from "tail";

/** The maximum number of lines to keep buffered */
const MAX_BUFFER_LINES = 40

export default class ServerConsole {
    #logPath: string
    #server: Server
    #lines: string[]

    public static createConsole(server: Server, logPath: string): ServerConsole {
        if(!logPath) return null
        try {
            const path = resolve(logPath)
            statSync(path)
        } catch(err) {
            if(err.code === "ENOENT")
                console.error(`[Server/${server.id}] ERROR: Log file does not exist at ${logPath}; skipping`)
            else throw err
        }
        
        return new ServerConsole(server, logPath)
    }

    /** Reads all lines from start to end */
    async #readExisting() {
        // Read previous lines
        const file = await open(this.#logPath, "r")
        if(!file) return console.warn(`[Server/${this.#server.id}] Warn: Cannot open log file ${this.#logPath}`)
        for await (const line of file.readLines()) {
            this.pushLine(line)
        }
        await file.close()
    }


    constructor(server: Server, logPath: string) {
        this.#server = server
        this.#logPath = logPath
    }

    public get logs() { return [...this.#lines] }

    /**
     * Returns a tail stream (live-view) of server's console logs
     * @returns 
     */
    async #createLogsReader() { 
      // Read previous lines
      const file = await open(this.#logPath)
      if(!file) return console.warn(`[Server/${this.#server.id}] ERROR: Cannot open file ${this.#logPath}`)
      for await (const line of file.readLines()) {
        this.pushLine(line)
      }
      await file.close()

      // Subscribe to new:
      const tail = new Tail(this.#logPath)
      tail.on('line', (line) => this.pushLine(line))
      tail.on("error", (err) => {
        console.warn(`[Server/${this.#server.id}] WARN: Log file stream errored.\n`, err)
      })
      return tail
    }

    /** Adds a line to the logs buffer, keeping only MAX_BUFFER_LINES recent entries
     * 
     * @param line the line to add 
     */
    public pushLine(line: string) {
        this.#lines.push(line)
        if(this.#lines.length > MAX_BUFFER_LINES) {
            this.#lines.splice(0, 1)
        }

        this.#server.emit("log", line)
    }

    // TODO: add live action / rcon sending? Might need to have ref to both RCON and Live system
    // Or this can handle live AND rcon, cleaning up Server
}