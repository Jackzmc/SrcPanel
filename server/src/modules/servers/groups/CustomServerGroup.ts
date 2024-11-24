import { CreateGroupOptions } from "./ServerGroup.js"
import ServerGroup from "./ServerGroup.js"
import DynamicServerManager from '../docker/DynamicServerManager.js';
import Server from "../Server.js";
import DynamicServerInstance from "../docker/DynamicServerInstance.js";
import DNS from 'dns/promises';
import { ServerAction } from "../../../../../common-types/Server.js";
import DockerServer from "../DockerServer.js";


export interface DynamicGroupServerTemplate {
    name?: string,
    ip: string,
    activityId?: string,
    tags?: string[],
    sortOrder?: number,
    actions?: ServerAction[]
}

export interface DynamicCreateGroupOptions extends CreateGroupOptions {
    templateId: string,
    serverTemplate: DynamicGroupServerTemplate,
    minServers?: number,
    maxEmptyServers?: number
}

export class CustomServerGroup extends ServerGroup<DockerServer> {
    #templateId: string
    #serverTemplate: DynamicGroupServerTemplate
    #minServers: number
    #manager: DynamicServerManager
    #maxEmptyServers: number | null = null

    constructor(dynamicManager: DynamicServerManager, id: string, options: DynamicCreateGroupOptions) {
        super(id, options)
        this.#manager = dynamicManager
        this.#templateId = options.templateId
        this.#serverTemplate = {
            name: options.serverTemplate.name ?? this.Name,
            // type: options.type,
            activityId: options.serverTemplate.activityId,
            ip: options.serverTemplate.ip,
            tags: options.serverTemplate.tags ?? [],
        }
        this.#minServers = options.minServers || 0
        this.#maxEmptyServers = options.maxEmptyServers ?? null
        if(this.#maxEmptyServers != undefined && this.#minServers > this.#maxEmptyServers) {
            console.warn(`[ServerGroup::Dynamic] Group \"${id}\" has minServers >= maxEmptyServers, clamping maxEmpty to `)
        }

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

    get TemplateId() {
        return this.#templateId
    }

    static formatTemplateVar(template: string, variables: Record<string, string | number>) {
        return Object.entries(variables)
            .reduce((acc, [key, value]) => {
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
        const ip = CustomServerGroup.formatTemplateVar(this.#serverTemplate.ip, vars)
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
                domain: host,
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

    async createNewServer(customName: string, volumes: string[] = []) {
        const instance = await this.#manager.createInstance(this.#templateId, volumes)
        const server = await this.#registerInstance(instance, customName)
        return server
    }

    async removeServer(server: DockerServer) {
        if(!this._servers[server.id]) throw new Error(`Server "${server.id}" is not registered for group (${this._id})`);
        delete this._servers[server.id]
        await server.ContainerInstance.delete();
    }
}