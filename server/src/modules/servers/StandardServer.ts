import { GameDig } from "gamedig";
import StandardLogs from "./features/logs/StandardLogs.js";
import ServerGroup from "./groups/ServerGroup.js";
import { ActionResponse, IAction } from "./IAction.js";
import Server from "./Server.js";
import { ListGroupConfig_Server } from "./groups/index.js";
import User from "../users/User.js";

const sleep = (time: number) => new Promise(res => setTimeout(res, time));

export default class StandardServer extends Server implements IAction {
    #startTime: number | null
    #cvars: Record<string, string>

    constructor(group: ServerGroup<Server>, server: ListGroupConfig_Server) {
        super(group, server, new GameDig({
            // listenUdpPort: 27005 
            // TODO: enable in docker
        }))

        if(server.logsPath) {
            this._logs = new StandardLogs(this, server.logsPath)
        }
    }

    get canPerformCommands() {
        return this.Plugin?.available == true || this.Rcon?.available == true
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

    async performAction(command: string, namespace: string, runAsUser?: User): Promise<ActionResponse> {
        if(this.Plugin?.available) {
            return await this.Plugin.performAction(command, namespace)
        } else if(this.Rcon?.available) {
            await this.Rcon.reconnect()
            return await this.Rcon.performAction(command, namespace)
        } else {
            throw new Error("Not connected to plugin socket or RCON")
        }
    }

    public override async update(bypassCache = false) {
        await super.update(bypassCache)
    }
}