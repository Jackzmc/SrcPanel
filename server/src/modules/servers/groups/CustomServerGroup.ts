import { CreateGroupOptions } from "./ServerGroup.js"
import ServerGroup from "./ServerGroup.js"
import DynamicServerManager, { DockerTemplateConfig, DockerTemplateContainer } from '../docker/DynamicServerManager.js';
import Server from "../Server.js";
import DynamicServerInstance from "../docker/DynamicServerInstance.js";
import DNS from 'dns/promises';
import { ServerAction } from "../../../../../common-types/Server.js";
import DockerServer from "../DockerServer.js";
import User from '../../users/User';
import { DockerGroupConfig } from "./index.js";
import BaseDynamicServerGroup from './BaseDynamicGroup.js';


export interface DynamicGroupServerTemplate {
    name?: string,
    host: string,
    activityId?: string,
    tags?: string[],
    sortOrder?: number,
    actions?: ServerAction[],
    cfgDir?: string
}

export interface CustomCreateGroupOptions extends CreateGroupOptions {
    templateId: string,
    serverTemplate: DynamicGroupServerTemplate,
}

// The maximum amount of time a server is empty before it is auto shutdown
const MAX_EMPTY_AUTO_SHUTDOWN_TIME = 1000 * 60 * 24
const CHECK_SERVER_INTERVAL = 1000 * 60 * 5

export class CustomServerGroup extends BaseDynamicServerGroup {
    constructor(dynamicManager: DynamicServerManager, group: DockerGroupConfig, template: DockerTemplateContainer, actions: ServerAction[] = []) {
        super(dynamicManager, group, template, actions)
        this.#checkServers()
        setInterval(() => this.#checkServers(), CHECK_SERVER_INTERVAL)
    }

    async recreateServers() {
        throw new Error("not implemented")
        // TODO: impl 
        for await(const [id, server] of this.#iterateServers()) {
            await this.removeServer(server)
        }
        await this.#checkServers()
    }

    async *#iterateServers(): AsyncGenerator<[string, DockerServer]> {
        for(const [id, server] of Object.entries(this.servers)) {
            if(server instanceof DockerServer) {
                const exists = await server.ContainerInstance.exists()
                if(!exists)  {
                    console.warn(`[Servers/${this.Id}]: Container gone for server ${id}, removing`)
                    this.manager.unregisterInstance(server.ContainerInstance)
                    delete this.servers[id]
                    continue
                }
                yield [id, server]
            }
        }
    }

    async #checkServers() {
        // Cleans up any servers with their container missing
        for await(const [id, server] of this.#iterateServers()) {

        }
        // Find any new instances
        await this.manager.findExisting()
        const instances = this.manager.getInstancesForTemplate(this.template.config.id)
        // TODO: check for # of servers that are active
        for(const instance of instances) {
            // Already configured, skip:
            if(instance.Server) continue
            const labels = await instance.labels()
            if(!labels["panel.custom_server"]) continue

            const owner = labels["panel.owner_steamid2"]
            const name = labels["panel.name"]
            console.log("registering existing", instance.ContainerId.substring(0, 12), name, labels)

            await this.registerInstance(instance, { name })
            // const state = await instance.state()
            // if(state.Running) {
            //     activeCount++;
            // } else if(activeCount < this.#minServers) {
            //     console.debug(`Starting stopped existing instance ${activeCount + 1}/${this.#minServers}`)
            //     // If we have servers but they aren't active, activate
            //     if(await instance.tryStart()) {
            //         activeCount++
            //     } else {
            //         console.error(`Failed to start instance ${instance.ContainerId}`)
            //     }
            // }
        }
    }

    get TemplateId() {
        return this.template.config.id
    }


    async createNewServer(customName: string, owner: User | null, volumes: string[] = []) {
        return await super._createNewServer({
            "panel.owner_steamid2": owner ? owner.steamid2 : undefined,
            "panel.name": customName,
        }, {
            name: customName
        })
    }

    async removeServer(server: DockerServer) {
        super.removeServer(server)
        await server.ContainerInstance.delete();
    }
}