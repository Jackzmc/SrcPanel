import SocketClientUser from "../../../../modules/servers/SocketClientUser.js"
import { Server_LogEntry } from "@jzpanel/common/ServerWebsocket"
import Server from "../../Server.js"
import Feature from "../Feature.js"

/** The maximum number of lines to keep buffered */
const MAX_BUFFER_LINES = 100

export type LineCallback = (line: string) => void

export default abstract class Logs extends Feature {
    protected _lines: { timestamp: number, content: string}[] = []

    constructor(server: Server) {
        super("Console", server)
    }

    abstract init(): Promise<void>;

    abstract get logs(): string[]

    abstract readExisting(): Promise<void>;
    
    /** Adds a line to the logs buffer, keeping only MAX_BUFFER_LINES recent entries
     * 
     * @param line the line to add 
     */
    public pushLine(line: string, timestamp: Date = new Date()) {
        const lineEntry = { timestamp: Math.round(timestamp.valueOf()/1000), content: line }
        this._lines.push(lineEntry)
        if(this._lines.length > MAX_BUFFER_LINES) {
            this._lines.splice(0, 1)
        }
        this._server.broadcastWS({
            type: "log",
            ...lineEntry
        } as Server_LogEntry)
    }

    sendHistory(client: SocketClientUser) {
        for(const entry of this._lines) {
            client.sendPayload({
                type: "log",
                ...entry
            } as Server_LogEntry)
        }
    }
}