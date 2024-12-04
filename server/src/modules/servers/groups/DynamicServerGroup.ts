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
    host: string,
    ip?: string
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

// The number of seconds minimum that a server has to be detected empty, before it can be purged
const MIN_EMPTY_TIME_FOR_PURGE = 1000 * 60 * 30
// The interval of time to check that servers exist and to purge/start servers
const CHECK_SERVER_INTERVAL = 1000 * 60 * 5

export class DynamicServerGroup extends ServerGroup<DockerServer> {
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
            host: options.serverTemplate.host,
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

        this.#checkServers()
        setInterval(() => this.#checkServers(), CHECK_SERVER_INTERVAL)
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

            await this.#registerInstance(instance)
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
        const servers = Object.values(this._servers).sort((a, b) => b.port - a.port)

        // Ensure a minimum number of servers exist and are running
        for(let i = servers.length; i < this.#minServers; i++) {
            console.debug(`Creating new instance ${servers.length + 1}/${this.#minServers}`)
            const server = await this.createNewServer()
            await server.start()
        }
        // Ensure a maximum number of servers
        if(this.#maxEmptyServers) {
            // Sort sorts descendingly by port, we want the latest created servers
            const servers = Object.values(this._servers).sort((a, b) => b.port - a.port)
            let maxEmptyTarget = Math.max(this.#maxEmptyServers, servers.length - this.#minServers) // number of servers we can purge
            if(maxEmptyTarget >= 0) { 
                for(const server of servers) {
                    // If there is no players and hasn't been for a while, we can purge this
                    if(server.status.data?.players.length === 0 && server.emptyTime && server.emptyTime > MIN_EMPTY_TIME_FOR_PURGE) {
                        console.info(`[ServerGroup::Dynamic] Purging empty server \"${server.id}\" (empty for ${server.emptyTime}sec)`)
                        try {
                            await server.stop(true)
                            await server.ContainerInstance.Container.remove()
                            maxEmptyTarget--
                            if(maxEmptyTarget == 0) break
                        } catch(err) {
                            console.error(`[ServerGroup::Dynamic] ERROR while purging \"${server.id}\":`, err)
                            break
                        }
                    }
                }
            }
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
            ip: instance.PublicIp,
            port: instance.Port,
        }
        const id = `${this.Id}-${instance.Port}`
        if(!this.#serverTemplate.host) {
            throw new Error(`Server template for group ${this.Id} has missing \"host\"`)
        }
        const host = DynamicServerGroup.formatTemplateVar(this.#serverTemplate.host, vars)
        let address: string|undefined = undefined
        try {
            const lookup = await DNS.lookup(host, { verbatim: false, family: 4 })
            address = lookup.address
        } catch(err) {
            throw new Error(`Could not resolve IP for hostname ${host}: ${err}`)
        }

        const server = new DockerServer(this, {
                id,
                name: DynamicServerGroup.formatTemplateVar(this.#serverTemplate.name ?? "", vars),
                host,
                ip: instance.PublicIp,
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

    async createNewServer() {
        const instance = await this.#manager.createInstance(this.#templateId)
        const server = await this.#registerInstance(instance)
        return server
    }
}