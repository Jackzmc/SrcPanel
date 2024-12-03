import { GameDig } from "gamedig";
import { CommandResultType } from "../../../../common-types/Live.js";
import { ServerAvailableFeatures } from "../../../../common-types/Server.js";
import DynamicServerInstance from "./docker/DynamicServerInstance.js";
import DockerLogs from "./features/logs/DockerLogs.js";
import ServerGroup from "./groups/ServerGroup.js";
import { ActionResponse, getFallbackCommandForBuiltin, IAction } from "./IAction.js";
import Server, { ServerExtendedData } from "./Server.js";

const PERFORM_ACTION_TIMEOUT = 20_000

export default class DockerServer extends Server implements IAction {
    // TODO: merge DynamicServerInstance into this?
    // TODO: Console support
    #instance: DynamicServerInstance
    constructor(group: ServerGroup<DockerServer>, server: ServerExtendedData, instance: DynamicServerInstance) {
        // Game dig needs listen udp port to be set for bridged docker containers
        super(group, server, new GameDig({
            listenUdpPort: 27005
        }))
        this.#instance = instance
        this._logs = new DockerLogs(this, this.#instance.Container)
    }

    get canPerformCommands() {
        return true
    }

    get startTime() {
        return this.#instance.StartTime
    }

    get features() {
        return {
            ...super.features,

            docker: true,
            canStart: true
        }
    }

    public get ContainerInstance() {
        return this.#instance
    }

    public async start() {
        return await this.#instance.start()
    }

    public async stop(force: boolean = false) {
        return await this.#instance.stop(force)
    }

    public async stopWait( force: boolean, timeoutSeconds?: number ): Promise<boolean> {
        return this.#instance.stop(force)
    }

    async #performBuiltin(command: string) {
        switch(command) {
            case "start": {
                await this.start()
                break
            }
            case "stop": {
                await this.stop(false)
                break
            }
            case "requestStop": {
                await this.stop(true)
                break
            }
            default:
                return false
        }
        return true
    }

    public async performAction( command: string, namespace: string ): Promise<ActionResponse> {
        if(namespace === "builtin") {
            // Try to run built in directly, and fallback to alternative command sent to server instead
            if(!await this.#performBuiltin(command)) {
                let cmd = getFallbackCommandForBuiltin(command)
                if(!cmd) throw new Error(`Unable to run builtin:${command} via docker (no available command)`)
                command = cmd
            }
        } else if(namespace !== "default") {
            throw new Error("Unsupported namespace")
        }
        const stream = await this.#instance.Container.attach({
            stdin: true,
            stdout: true,
            stream: true
        })
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => {
                const msg = chunk.toString()
                stream.end()
                resolve({
                    type: CommandResultType.None,
                    message: msg,
                    result: 0
                })
            })

            setTimeout(() => {
                stream.end()
                reject(new Error("Action timed out"))
            }, PERFORM_ACTION_TIMEOUT)

            stream.write(command + "\n")
        })
    }

    public override async refreshStatus(bypassCache = false) {
        // Don't need to do a refresh if we have plugin data
        if(!this.Plugin || !this.Plugin.authenticated)
            await this.getStatus(bypassCache, this.type, this.ip, this.port)

        const state = await this.#instance.state()
        this._online = state.Running
    }

}