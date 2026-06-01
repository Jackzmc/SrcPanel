import { CreateGroupOptions } from "./ServerGroup.js"
import DynamicServerManager from '../docker/DynamicServerManager.js';
import { ServerAction } from "@jzpanel/common/Server";
import DockerServer from "../DockerServer.js";
import { DockerGroupConfig } from "./index.js";
import BaseDynamicServerGroup from "./BaseDynamicGroup.js";
import type { DockerTemplateContainer } from '../docker/DynamicServerManager.js';


export interface DynamicGroupServerTemplate {
    name?: string,
    host: string,
    ip?: string
    activityId?: string,
    tags?: string[],
    sortOrder?: number,
    actions?: ServerAction[],
    cfgDirectory?: string
}

export interface DynamicCreateGroupOptions extends CreateGroupOptions {
    templateId: string,
    serverTemplate: DynamicGroupServerTemplate,
    minServers?: number,
    maxEmptyServers?: number
}

const DOCKER_SERVER_READ_ONLY = process.env.DOCKER_SERVER_READ_ONLY

// The number of seconds minimum that a server has to be detected empty, before it can be purged
const MIN_EMPTY_TIME_FOR_PURGE = 1000 * 60 * 30
// The interval of time to check that servers exist and to purge/start servers
const CHECK_SERVER_INTERVAL = 1000 * 60 * 5

export class DynamicServerGroup extends BaseDynamicServerGroup {
    #minServers: number 
    #maxEmptyServers: number | null = null

 
    constructor(dynamicManager: DynamicServerManager, group: DockerGroupConfig, template: DockerTemplateContainer, actions: ServerAction[]) {
        super("docker", dynamicManager, group, template, actions)
        this.#minServers = group.docker.min || 0
        this.#maxEmptyServers = group.docker.max ?? null

        this.#checkServers()
        setInterval(() => this.#checkServers(), CHECK_SERVER_INTERVAL)
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

    async recreateServers() {
        for await(const [id, server] of this.#iterateServers()) {
            await this.removeServer(server)
        }
        await this.#checkServers()
    }

    async #checkServers() {
        // Cleans up any servers with their container missing
        for await(const [id, server] of this.#iterateServers()) {
            // TODO: impl
        }
        // Find any new instances
        await this.manager.findExisting()
        const instances = this.manager.getInstancesForTemplate(this.TemplateId)
        // TODO: check for # of servers that are active
        for(const instance of instances) {
            // Already configured, skip:
            if(instance.Server) continue

            await this.registerInstance(instance)
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
        const servers = Object.values(this.servers).sort((a, b) => b.port - a.port)
        if(DOCKER_SERVER_READ_ONLY) return

        // Ensure a minimum number of servers exist and are running
        for(let i = servers.length; i < this.#minServers; i++) {
            console.debug(`Creating new instance ${servers.length + 1}/${this.#minServers}`)
            try {
                const server = await this.createNewServer()
                await server.start()
            } catch(err) {
                console.error(`[ServerGroup::Dynamic] Failed to start new server (#${i+1}), skipping to purge step.\n`, err)
                break
            }
        }
        // Ensure a maximum number of servers
        if(this.#maxEmptyServers) {
            // Sort sorts descendingly by port, we want the latest created servers
            const servers = Object.values(this.servers).sort((a, b) => b.port - a.port)
            let maxEmptyTarget = Math.max(this.#maxEmptyServers, servers.length - this.#minServers) // number of servers we can purge
            if(maxEmptyTarget >= 0) { 
                for(const server of servers) {
                    // If there is no players and hasn't been for a while, we can purge this
                    if(server.status.data?.players.length === 0 && server.emptyTime && server.emptyTime > MIN_EMPTY_TIME_FOR_PURGE) {
                        console.info(`[ServerGroup::Dynamic] Purging empty server "${server.id}" (empty for ${server.emptyTime}sec)`)
                        try {
                            await server.stop(true)
                            await server.ContainerInstance.Container.remove()
                            maxEmptyTarget--
                            if(maxEmptyTarget == 0) break
                        } catch(err) {
                            console.error(`[ServerGroup::Dynamic] ERROR while purging "${server.id}":`, err)
                            break
                        }
                    }
                }
            }
        }
    }

    async update() {
        for await(const [id, server] of this.#iterateServers()) {
            // TODO: impl
        }
    }

    async removeServer(server: DockerServer) {
        if(!this.servers[server.id]) throw new Error(`Server "${server.id}" is not registered for group (${this.id})`);
        // Try to stop, ignore errors
        try {
            await server.ContainerInstance.stop(true)
        } catch(_) {

        }
        delete this.servers[server.id]
        await server.ContainerInstance.delete();
    }

    async createNewServer() {
        return this._createNewServer()
    }

    getServerByContainerId(containerId: string) {
        for(const server of Object.values(this.servers)) {
            if(server.ContainerInstance.ContainerId === containerId) return server
        }
        return null
    }
}