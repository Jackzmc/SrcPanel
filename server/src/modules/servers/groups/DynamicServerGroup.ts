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
    minServers?: number
}

export class DynamicServerGroup extends ServerGroup {
    #templateId: string
    #serverTemplate: DynamicGroupServerTemplate
    #minServers: number
    #manager: DynamicServerManager

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

        this.#checkServers()
    }

    async #checkServers() {
        const instances = this.#manager.getInstancesForTemplate(this.#templateId)
        let activeCount = 0
        for(const instance of instances) {
            await this.#registerInstance(instance)
            const state = await instance.State()
            if(state.Running) {
                activeCount++;
            } else if(activeCount < this.#minServers) {
                // If we have servers but they aren't active, activate
                await instance.Start()
                activeCount++
            }
        }
        for(let i = activeCount; i < this.#minServers; i++) {
            console.debug(`Starting instance ${i+1}/${this.#minServers}`)
            const instance = await this.createInstance()
            await instance.Start()
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
            id: Object.keys(this._servers).length + 1,
            port: instance.Port,
        }
        const id = `${this.Id}-${instance.Port}`
        const ip = DynamicServerGroup.formatTemplateVar(this.#serverTemplate.ip, vars)
        const [, host, port] = ip.match(/([a-zA-Z0-9.]+):?(\d*)/)
        try {
            const lookup = await DNS.lookup(host, { verbatim: false, family: 4 })
            this._servers[id] = new DockerServer(this, {
                id,
                name: DynamicServerGroup.formatTemplateVar(this.#serverTemplate.name, vars),
                ip: lookup.address,
                domain: host,
                port: instance.Port,
                type: this.Type,
                tags: this.#serverTemplate.tags,
                actions: this.#serverTemplate.actions ?? [],
                activityId: this.#serverTemplate.activityId,
                sortOrder: this.#serverTemplate.sortOrder
            }, instance)
        } catch(err) {
            console.warn(`[ServerManager] Warn: Could not resolve IP for hostname ${host}:\n`, err)
        }
        
    }

    async createInstance() {
        const instance = await this.#manager.createInstance(this.#templateId)
        await this.#registerInstance(instance)
        return instance
    }
}