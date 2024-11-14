import { ServerAvailableFeatures } from "../../../../common-types/Server.js";
import DynamicServerInstance from "./docker/DynamicServerInstance.js";
import ServerGroup from "./groups/ServerGroup.js";
import { ActionResponse } from "./IAction.js";
import Server, { ServerExtendedData } from "./Server.js";

export default class DockerServer extends Server {
    // TODO: merge DynamicServerInstance into this?
    // TODO: Console support
    #instance: DynamicServerInstance
    constructor(group: ServerGroup, server: ServerExtendedData, instance: DynamicServerInstance) {
        super(group, server)
        this.#instance = instance
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

    public performAction( command: string, namespace: string ): Promise<ActionResponse> {
        throw new Error("not available")
    }

    public override async refreshStatus(bypassCache = false) {
        const ret = super.refreshStatus(bypassCache)
        const state = await this.#instance.State()
        this._status.online = state.Running
        return ret
    }

}