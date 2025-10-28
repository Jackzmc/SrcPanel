import Logs from "./Console.js";
import Server from "../../Server.js";
import { Container } from "dockerode";
import Stream from 'node:stream'

import stripAnsi from 'strip-ansi';
import { isDate } from "node:util/types";

/** The maximum number of lines to keep buffered */
const MAX_BUFFER_LINES = 40


export default class DockerLogs extends Logs {
    #container: Container
    #lastLogTime: Date
    // line buffer
    #line: string = ""

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
        return [...this._lines.map(line => line.content)]
    }

        /** Reads all lines from start to end, keeping only last MAX_BUFFER_LINES */
    async readExisting() {
        const logs = await this.#container.logs({ stdout: true, stderr: true, tail: MAX_BUFFER_LINES })
        const lines = logs.toString().split("\n")
        for(const line of lines) {
            this.pushLine(stripAnsi(line))
        }
        this.#lastLogTime = new Date()
    }

    /**
     * Returns a tail stream (live-view) of server's console logs
     * @returns 
     */
    async #createLogsReader() { 
        const stream = new Stream.PassThrough();
        // tail: 0 stops it from reading the entire log history - we don't want that when the process restarts
        const reader = await this.#container.logs({ stdout: true, stderr: true, follow: true, timestamps: true, tail: 0 })
        this.#container.modem.demuxStream(stream, reader, reader)
        reader.on("data", chunk => this.#onLogChunk(chunk))

        reader.on("close", () => {
            this.#lastLogTime = new Date()
            this.pushLine("--- END OF PROCESS ---\n", this.#lastLogTime)
            this.#line = ""
            // reader.removeAllListeners()
            // console.log("Logs ended, recreate")
        })
    }

    #onLogChunk(chunk: any) {
        // Append to our buffer
        this.#line += chunk.toString('utf8')
        const lines = this.#line.split("\n")
        // If there is a newline, length will be > 1
        if(lines.length > 1) {
            // Loop through all the existing lines, in case there is 2+ new lines
            while(lines.length > 1) {
                const line = lines.shift()!
                // { timestamps: true } returns 2025-09-15T21:47:20.521373516Z MESSAGE HERE
                // we split the timestamp and msg
                const spaceKeyIndex = line.indexOf(" ")
                const timestamp = new Date(line.substring(0, spaceKeyIndex))
                // console.debug({ timestamp: timestamp.valueOf(), len: line.length, lastLogTime: this.#lastLogTime.valueOf(), delta: timestamp.valueOf() - this.#lastLogTime.valueOf(), msg: stripAnsi(line.substring(spaceKeyIndex + 1)), line })

                // Ignore any logs in the past. When the service restarts, docker for some reason sends the entire log history, which will be in the past, ignore it.
                // new Date() returns NaN if no timestamp, but TS doesn't like - so isDate() here:
                if(isDate(timestamp) && timestamp >= this.#lastLogTime) {
                    const msg = line.substring(spaceKeyIndex + 1)
                    this.pushLine(stripAnsi(msg), timestamp)
                    this.#lastLogTime = timestamp
                }
            }
            // Set our buffer to the very end
            this.#line = lines[0]
        }
    }
}
