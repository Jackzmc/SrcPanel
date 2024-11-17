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
        super(group, server)
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
            docker: true
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

    public async performAction( command: string, namespace: string ): Promise<ActionResponse> {
        if(namespace === "builtin") {
            command = getFallbackCommandForBuiltin(command)
            if(!command) throw new Error(`Unable to run builtin:${command} via docker`)
        }
        else if(namespace !== "default") {
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
        if(this.Plugin && this.Plugin.authenticated) return console.log("skipping: plugin conn");
        console.log(this.id, 'refreshStatus', `internal=${this.ContainerInstance.InternalIp}`, `ext=${this.ContainerInstance.PublicIp}`)
        await super.getStatus(bypassCache, this.type, this.ContainerInstance.InternalIp, this.port)

        const state = await this.#instance.state()
        this._online = state.Running
    }

}