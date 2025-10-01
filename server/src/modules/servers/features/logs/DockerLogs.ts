import Logs from "./Console.js";
import Server from "../../Server.js";
import { Container } from "dockerode";

import stripAnsi from 'strip-ansi';

/** The maximum number of lines to keep buffered */
const MAX_BUFFER_LINES = 40


export default class DockerLogs extends Logs {
    #container: Container
    #lastLogTime: Date

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
        const reader = await this.#container.logs({ stdout: true, stderr: true, follow: true, timestamps: true })
        this.#container.modem.demuxStream(stream, reader, reader)
        let line: string
        reader.on("data", (chunk) => {
            // Append to our buffer
            line += chunk.toString('utf8')
            const lines = line.split("\n")
            // If there is a newline, length will be > 1
            if(lines.length > 1) {
                // Loop through all the existing lines, in case there is 2+ new lines
                while(lines.length > 1) {
                    const line = lines.shift()!
                    // { timestamps: true } returns 2025-09-15T21:47:20.521373516Z MESSAGE HERE
                    // we split the timestamp and msg
                    const spaceKeyIndex = line.indexOf(" ")
                    const timestamp = new Date(line.substring(0, spaceKeyIndex))

                    // Ignore any logs in the past
                    if(timestamp >= this.#lastLogTime) {
                        const msg = line.substring(spaceKeyIndex + 1)
                        this.pushLine(stripAnsi(msg))
                        this.#lastLogTime = timestamp
                    }
                }
                // Set our buffer to the very end
                line = lines[0]
            }
            
        })
    }
}
