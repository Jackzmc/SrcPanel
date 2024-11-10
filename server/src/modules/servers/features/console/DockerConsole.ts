import { statSync } from "fs";
import { open } from 'fs/promises'
import Console from "./Console.js";
import { Tail } from "tail";
import Server from "../../Server.js";
import { Container } from "dockerode";

/** The maximum number of lines to keep buffered */
const MAX_BUFFER_LINES = 40

export default class DockerConsole extends Console {
    #container: Container

    constructor(server: Server, container: Container) {
        super(server)
        this.#container = container
    }

    get available() {
        return true
    }

    async init() {
        await this.readExisting()
        await this.#createLogsReader()
    }

    public get logs() { 
        return this._lines
    }

        /** Reads all lines from start to end, keeping only last MAX_BUFFER_LINES */
    async readExisting() {
        const logs = await this.#container.logs({ stdout: true, stderr: true })
        const lines = logs.toString().split("\n")
        for(const line of lines) {
            this.pushLine(line)
        }

        
    }

    /**
     * Returns a tail stream (live-view) of server's console logs
     * @returns 
     */
    async #createLogsReader() { 
      const reader = await this.#container.logs({ stdout: true, stderr: true, follow: true })
        let line: string
        reader.on("data", (chunk) => {
            // Append to our buffer
            line += chunk.toString('utf8')
            const lines = line.split("\n")
            // If there is a newline, length will be > 1
            if(lines.length > 1) {
                // Loop through all the existing lines, in case there is 2+ new lines
                while(lines.length > 1) {
                    const line = lines.shift()
                    this.pushLine(line)
                }
                // Set our buffer to the very end
                line = lines[0]
            }
            
        })
    }
}
