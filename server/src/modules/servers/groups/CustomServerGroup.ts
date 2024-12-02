import { CreateGroupOptions } from "./ServerGroup.js"
import ServerGroup from "./ServerGroup.js"
import DynamicServerManager from '../docker/DynamicServerManager.js';
import Server from "../Server.js";
import DynamicServerInstance from "../docker/DynamicServerInstance.js";
import DNS from 'dns/promises';
import { ServerAction } from "../../../../../common-types/Server.js";
import DockerServer from "../DockerServer.js";
import User from '../../users/User';


export interface DynamicGroupServerTemplate {
    name?: string,
    host: string,
    ip: string,
    activityId?: string,
    tags?: string[],
    sortOrder?: number,
    actions?: ServerAction[]
}

export interface CustomCreateGroupOptions extends CreateGroupOptions {
    templateId: string,
    serverTemplate: DynamicGroupServerTemplate,
}

// The maximum amount of time a server is empty before it is auto shutdown
const MAX_EMPTY_AUTO_SHUTDOWN_TIME = 1000 * 60 * 24
const CHECK_SERVER_INTERVAL = 1000 * 60 * 5

export class CustomServerGroup extends ServerGroup<DockerServer> {
    #templateId: string
    #serverTemplate: DynamicGroupServerTemplate
    #manager: DynamicServerManager

    constructor(dynamicManager: DynamicServerManager, id: string, options: CustomCreateGroupOptions) {
        super(id, options)
        this.#manager = dynamicManager
        this.#templateId = options.templateId
        this.#serverTemplate = {
            name: options.serverTemplate.name ?? this.Name,
            // type: options.type,
            host: options.serverTemplate.host,
            activityId: options.serverTemplate.activityId,
            ip: options.serverTemplate.ip,
            tags: options.serverTemplate.tags ?? [],
        }
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
        for(const [id, server] of Object.entries(this._servers)) {
            if(server instanceof DockerServer) {
                const exists = await server.ContainerInstance.exists()
                if(!exists)  {
                    console.warn(`[Servers/${this.Id}]: Container gone for server ${id}, removing`)
                    this.#manager.unregisterInstance(server.ContainerInstance)
                    delete this._servers[id]
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
        await this.#manager.findExisting()
        const instances = this.#manager.getInstancesForTemplate(this.#templateId)
        // TODO: check for # of servers that are active
        for(const instance of instances) {
            // Already configured, skip:
            if(instance.Server) continue
            const labels = await instance.labels()
            if(!labels["panel.custom_server"]) continue

            const owner = labels["panel.owner_steamid2"]
            const name = labels["panel.name"]
            console.log("registering existing", instance.ContainerId.substring(0, 12), name, labels)

            await this.#registerInstance(instance, name)
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
        return this.#templateId
    }

    static formatTemplateVar(template: string, variables: Record<string, string | number>) {
        return Object.entries(variables)
            .reduce((acc, [key, value]) => {
                if(!value) return acc
                return acc.replace(new RegExp(`%${key}%`, 'g'), value.toString())
            }, template)
    }

    async #registerInstance(instance: DynamicServerInstance, customName: string) {
        const vars = {
            id: instance.TemplateId,
            index: Object.keys(this._servers).length + 1,
            ip: instance.PublicIp,
            port: instance.Port,
            name: customName
        }
        const id = `${this.Id}-${instance.Port}`
        const ip = CustomServerGroup.formatTemplateVar(this.#serverTemplate.host, vars)
        const [, host, port] = ip.match(/([a-zA-Z0-9.]+):?(\d*)/) ?? []
        let address = instance.PublicIp
        try {
            const lookup = await DNS.lookup(host, { verbatim: false, family: 4 })
            address = lookup.address
        } catch(err) {
            console.warn(`[ServerManager] Warn: Could not resolve IP for hostname ${host}:\n`, err)
        }
        const server = new DockerServer(this, {
                id,
                name: CustomServerGroup.formatTemplateVar(this.#serverTemplate.name ?? "", vars),
                ip: address,
                host: host,
                port: instance.Port,
                type: this.Type,
                tags: this.#serverTemplate.tags ?? [],
                actions: this.#serverTemplate.actions ?? [],
                activityId: this.#serverTemplate.activityId,
                sortOrder: this.#serverTemplate.sortOrder
            }, instance)
        instance.setServer(server)
        await server.init()
        this._servers[id] = server
        return server
    }

    async createNewServer(customName: string, owner: User | null, volumes: string[] = []) {
        const instance = await this.#manager.createInstance(this.#templateId, volumes, {
            "panel.owner_steamid2": owner ? owner.steamid2 : undefined,
            "panel.name": customName,
            "panel.custom_server": "true",

        })
        const server = await this.#registerInstance(instance, customName)
        return server
    }

    async removeServer(server: DockerServer) {
        if(!this._servers[server.id]) throw new Error(`Server "${server.id}" is not registered for group (${this._id})`);
        delete this._servers[server.id]
        await server.ContainerInstance.delete();
    }
}