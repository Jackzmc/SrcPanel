import { LiveDataCache, LiveRecordResponse } from "../../../../common-types/Live.js";
import { ServerType, ServerStatus } from "../../../../common-types/Server.js";
import ConfigsFeature from "./features/Configs.js";
import Logs from "./features/logs/Console.js";
import StandardLogs from "./features/logs/StandardLogs.js";
import PluginFeature from "./features/Plugin.js";
import RconFeature from "./features/Rcon.js";
import ServerGroup from "./groups/ServerGroup.js";
import { ActionResponse } from "./IAction.js";
import Server, { ServerExtendedData } from "./Server.js";

const sleep = (time: number) => new Promise(res => setTimeout(res, time));

export default class StandardServer extends Server {
    #startTime: number | null
    #cvars: Record<string, string>

    constructor(group: ServerGroup<Server>, server: ServerExtendedData) {
        super(group, server)

        if(server.rcon) {
            let password: string
            if(server.rcon.password.value) password = server.rcon.password.value
            if(server.rcon.password.env) password = process.env[server.rcon.password.env]
            this._rcon = new RconFeature(this, {
                host: server.ip,
                port: server.port,
                password
            })
        }
        if(server.logsPath) {
            this._logs = new StandardLogs(this, server.logsPath)
        }
    }

    get canPerformCommands() {
        return this.Plugin?.available || this.Rcon?.available
    }

    get startTime(): number | null {
        return this.#startTime
    }
    get cvars() {
        return this.#cvars
    }
    start(): Promise<void> {
        throw new Error( "Method not implemented." );
    }

    async stop( force: boolean ): Promise<boolean> {
        if(force) {
            const result = await this.performAction("stop", "builtin")
            return Boolean(result.result)
        } else {
            const result = await this.performAction("request_stop", "builtin")
            return Boolean(result.result)
        }
    }
    
    async stopWait( force: boolean, timeoutSeconds: number ): Promise<boolean> {
        if(!await this.stop(force)) return false
        // The stop happens a frame after, wait a second
        await sleep(1000) 
        // Wait until socket re-established
        while(!this.Plugin.authenticated && timeoutSeconds > 0) {
            timeoutSeconds -= 1000
            await sleep(1000)
        }
        return timeoutSeconds > 0
    }

    async performAction( command: string, namespace: string ): Promise<ActionResponse> {
        if(this.Plugin?.available) {
            return await this.Plugin.performAction(command, namespace)
        } else if(this.Rcon?.available) {
            await this.Rcon.reconnect()
            return await this.Rcon.performAction(command, namespace)
        } else {
            throw new Error("Not connected to plugin socket or RCON")
        }
    }

}