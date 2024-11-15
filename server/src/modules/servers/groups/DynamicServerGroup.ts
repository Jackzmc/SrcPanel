import { CreateGroupOptions } from "./ServerGroup.js"
import ServerGroup from "./ServerGroup.js"
import DynamicServerManager from '../docker/DynamicServerManager';
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
    serverTemplate: Partial<DynamicGroupServerTemplate>,
    minServers?: number,
    maxEmptyServers?: number
}

export class DynamicServerGroup extends ServerGroup {
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
            ip: options.serverTemplate.ip,
            tags: options.serverTemplate.tags ?? []
        }
        this.#minServers = options.minServers || 0
        this.#maxEmptyServers = options.maxEmptyServers

        this.#checkServers()
    }

    async *#iterateServers(): AsyncGenerator<[string, DockerServer]> {
        for(const [id, server] of Object.entries(this._servers)) {
            if(server instanceof DockerServer) {
                const exists = await server.ContainerInstance.Exists()
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
        for await(const [id, server] of this.#iterateServers()) {
        }
        const instances = this.#manager.getInstancesForTemplate(this.#templateId)
        let activeCount = 0
        for(const instance of instances) {
            await this.#registerInstance(instance)
            const state = await instance.State()
            if(state.Running) {
                activeCount++;
            } else if(activeCount < this.#minServers) {
                console.debug(`Starting existing instance ${activeCount + 1}/${this.#minServers}`)
                // If we have servers but they aren't active, activate
                try {
                    await instance.Start()
                    activeCount++
                } catch(err) {
                    console.error(`Failed to start instance ${instance.ContainerId}`)
                }
            }
        }
        for(let i = activeCount; i < this.#minServers; i++) {
            console.debug(`Creating new instance ${activeCount + 1}/${this.#minServers}`)
            const instance = await this.createInstance()
            await instance.Start()
        }
    }
    
    async update() {
        for await(const [id, server] of this.#iterateServers()) {

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

    async #registerInstance(instance: DynamicServerInstance) {
        const vars = {
            id: instance.TemplateId,
            index: Object.keys(this._servers).length + 1,
            ip: instance.Ip,
            port: instance.Port,
        }
        const id = `${this.Id}-${instance.Port}`
        const ip = DynamicServerGroup.formatTemplateVar(this.#serverTemplate.ip, vars)
        const [, host, port] = ip.match(/([a-zA-Z0-9.]+):?(\d*)/)
        let address = instance.Ip
        try {
            const lookup = await DNS.lookup(host, { verbatim: false, family: 4 })
            address = lookup.address
        } catch(err) {
            console.warn(`[ServerManager] Warn: Could not resolve IP for hostname ${host}:\n`, err)
            return
        }
        const server = new DockerServer(this, {
                id,
                name: DynamicServerGroup.formatTemplateVar(this.#serverTemplate.name, vars),
                ip: address,
                domain: host,
                port: instance.Port,
                type: this.Type,
                tags: this.#serverTemplate.tags,
                actions: this.#serverTemplate.actions ?? [],
                activityId: this.#serverTemplate.activityId,
                sortOrder: this.#serverTemplate.sortOrder
            }, instance)
        await server.init()
        this._servers[id] = server
    }

    async createInstance() {
        const instance = await this.#manager.createInstance(this.#templateId)
        await this.#registerInstance(instance)
        return instance
    }
}