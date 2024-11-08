import { ServerAvailableFeatures } from "../../../../common-types/Server.js";
import DynamicServerInstance from "./docker/DynamicServerInstance.js";
import ServerGroup from "./groups/ServerGroup.js";
import Server, { ServerExtendedData } from "./Server.js";

export default class DockerServer extends Server {
    // TODO: merge DynamicServerInstance into this?
    // TODO: Console support
    #instance: DynamicServerInstance
    constructor(group: ServerGroup, server: ServerExtendedData, instance: DynamicServerInstance) {
        super(group, server)
        this.#instance = instance
    }

    public override get features(): ServerAvailableFeatures {
      return {
        rcon: this.hasRcon,
        console: this.hasConsole,
        configs: this.hasConfigs,
        systemd: this.hasSystemd,
        plugin: this.hasPlugin,
        docker: true
      }
    }

    public override async start() {
        return await this.#instance.Start()
    }

    public override  async stop() {
        return await this.#instance.Stop()
    }

    public override async stopWait( force: boolean, timeoutSeconds?: number ): Promise<boolean> {
        return this.#instance.Stop(force)
    }

    public override async refresh(bypassCache = false, includeRules = false) {
        const ret = super.refresh(bypassCache, includeRules)
        const state = await this.#instance.State()
        this._status.online = state.Running
        return ret
    }

}