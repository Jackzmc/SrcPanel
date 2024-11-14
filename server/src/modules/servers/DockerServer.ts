import { CommandResultType } from "../../../../common-types/Live.js";
import { ServerAvailableFeatures } from "../../../../common-types/Server.js";
import DynamicServerInstance from "./docker/DynamicServerInstance.js";
import DockerConsole from "./features/console/DockerConsole.js";
import ServerGroup from "./groups/ServerGroup.js";
import { ActionResponse, getFallbackCommandForBuiltin, IAction } from "./IAction.js";
import Server, { ServerExtendedData } from "./Server.js";

const PERFORM_ACTION_TIMEOUT = 20_000

export default class DockerServer extends Server implements IAction {
    // TODO: merge DynamicServerInstance into this?
    // TODO: Console support
    #instance: DynamicServerInstance
    constructor(group: ServerGroup, server: ServerExtendedData, instance: DynamicServerInstance) {
        super(group, server)
        this.#instance = instance
        this._console = new DockerConsole(this, this.#instance.Container)
    }

    get canPerformCommands() {
        return true
    }

    get uptime() {
        return null
    }

    get startTime() {
        return null
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
        return await this.#instance.Start()
    }

    public async stop() {
        return await this.#instance.Stop()
    }

    public async stopWait( force: boolean, timeoutSeconds?: number ): Promise<boolean> {
        return this.#instance.Stop(force)
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
        const ret = super.refreshStatus(bypassCache)
        const state = await this.#instance.State()
        this._status.online = state.Running
        return ret
    }

}