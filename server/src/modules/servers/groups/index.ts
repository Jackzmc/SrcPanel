import { readFile } from "fs/promises"
import { join } from "path"
import yaml from 'yaml';
import ServerGroup from "./ServerGroup.js";
import DynamicServerManager from "../docker/DynamicServerManager.js";
import { CustomServerGroup } from "./CustomServerGroup.js";
import { DynamicServerGroup } from "./DynamicServerGroup.js";
import { StandardServerGroup } from "./StandardServerGroup.js";
import { ServerAction } from "@srcpanel/common/Server";
import logger from '../../../logger.js'
const log = logger.child({ name: "groups/index" })

const CONFIG_FILE = "server_groups.yml"

async function loadData(configDir: string): Promise<{[key: string]: any}> {
    try {
        const content = await readFile(join(configDir, CONFIG_FILE), 'utf-8')
        return yaml.parse(content)
    } catch(err) {
        throw new Error(`Could not parse ${CONFIG_FILE}`, { cause: err })
    }
}

export async function loadGroups(configDir: string, dynamicManager: DynamicServerManager | undefined, actions: Record<string, ServerAction>) {
    const startTime = performance.now()

    log.info("Actions: " + Object.keys(actions).join(" "))
    
    const raw = await loadData(configDir)
    const groups = {}
    
    for(const [groupId, data] of Object.entries(raw)) {
        const parsedGroup = parseGroup(groupId, data)
        if('docker' in parsedGroup && !dynamicManager) {
            log.warn(`Skipping group ${groupId} (docker not enabled)`)
            continue
        }
        const group = await loadGroup(dynamicManager, actions, parsedGroup)
        groups[groupId] = group
    }
    const time = performance.now() - startTime
    log.info(`[ServerManager] Loaded ${Object.keys(groups).length} groups in ${time.toFixed(1)} ms`)
    return groups
}


export interface BaseGroupConfig {
    id: string,
    name?: string,
    game?: string,
    actionsIds: string[],
    activityId?: string,
}
export interface DockerGroupConfig extends BaseGroupConfig {
    game: string,
    docker: {
        template: string,
        custom?: boolean,
        min?: number,
        max?: number
    }
}
export interface ListGroupConfig extends BaseGroupConfig {
    servers: Record<string, ListGroupConfig_Server>
}
export interface ListGroupConfig_Server {
    id: string,
    name?: string,
    public: {
        host: string,
        port: number
    },
    internal?: {
        host?: string,
        port?: number
    },
    tags?: string[],

    game?: string,
    sortOrder?: number,
    cfgDirectory?: string,
    activityId?: string,
    logsPath?: string,
    rcon?: {
        ip?: string,
        port?: number,
        password: string,
    },
    actionsIds?: string[]
}
type GroupConfig = ListGroupConfig | DockerGroupConfig
function parseGroup(id: string, data: Record<string, any>): GroupConfig {
    const base: BaseGroupConfig = {
        id: id,
        name: data.name,
        actionsIds: data.actions ?? [],
        activityId: data.activityId,
        game: data.game,
    }
    if(data.servers != undefined && data.docker != undefined) throw new Error("Invalid group entry, must include either 'servers' or 'docker' section, not both")

    if(data.servers) {
        const servers: Record<string, ListGroupConfig_Server> = Object.fromEntries(Object.entries<{[i:string]: any}>(data.servers)
            .map(([id, server]) => {
                if(!server.public) throw new Error("Missing property 'server.public' in " + JSON.stringify(server))
                if(!server.public.host) throw new Error("Missing property 'server.public.host' in " + JSON.stringify(server))
                if(!server.public.port) throw new Error("Missing property 'server.public.port' in " + JSON.stringify(server))

                const pubPort = parseInt(server.public.port)
                if(isNaN(pubPort) || pubPort <= 0 || pubPort >= 65535) throw new Error("'server.public.port' is invalid number, must be between 1 and 65535, is " + pubPort)
                if(server.internal?.port) {
                    const port = parseInt(server.internal.port)
                    if(isNaN(port) || port <= 0 || port >= 65535) throw new Error("'server.internal.port' is invalid number, must be between 1 and 65535, is " + port)
                }
                if(server.rcon) {
                    if(server.rcon.password_env) {
                        server.rcon.password = process.env[server.rcon.password_env]
                        if(!server.rcon.password) throw new Error(`Could not find env variable ${server.rcon.password_env} for rcon password in ` + JSON.stringify(server))
                    }
                }
                if(!server.game && !base.game) throw new Error("Missing 'game' property, either add to server or group")
                const ret: ListGroupConfig_Server = {
                    id,
                    name: server.name,
                    public: {
                        host: server.public.host,
                        port: server.public.port
                    },
                    internal: server.internal && {
                        host: server.internal.host,
                        port: server.internal.port
                    },
                    game: server.game,
                    tags: server.tags ?? [],

                    actionsIds: server.actions ?? [],
                    sortOrder: server.sortOrder,
                    rcon: server.rcon && {
                        ip: server.rcon.ip,
                        port: server.rcon.port,
                        password: server.rcon.password // possibly set above from env
                    },
                    logsPath: server.logsPath,
                    cfgDirectory: server.cfgDir
                }
                return [id, ret]
            }))
        const ret: ListGroupConfig = {
            ...base,
            servers
        }
        return ret
    } else if(data.docker) {
        if(!data.docker.template) throw new Error("Missing property 'docker.template' in " + JSON.stringify(data))
        if(!data.game) throw new Error("Missing property 'docker.game' in " + JSON.stringify(data))
        const ret: DockerGroupConfig = {
            ...base,
            actionsIds: [...base.actionsIds],
            game: data.game,
            docker: {
                template: data.docker.template,
                custom: data.docker.custom ?? false
            }
        }
        if(ret.docker.custom) {
            ret.docker.min = data.docker.min ? parseInt(data.docker.min) : 0
            ret.docker.max = ret.docker.max && parseInt(data.docker.max)
            if(isNaN(ret.docker.min) || ret.docker.min < 0) throw new Error("Property 'docker.min' is invalid, it must be a number >= 0, in " + JSON.stringify(data))
            if(ret.docker.max && (isNaN(ret.docker.max) || ret.docker.max < 0)) throw new Error("Property 'docker.max' is invalid, it must be a number >= 0, in " + JSON.stringify(data))
            if(ret.docker.max != undefined && ret.docker.min != undefined && ret.docker.max < ret.docker.min) 
                throw new Error("Property 'docker.max' must be greater than 'docker.min'")
            
        }
        return ret
    }
    throw new Error("Invalid group entry, must include a 'servers' section or 'docker' section")
} 

async function loadGroup(dynamicGroupManager: DynamicServerManager | undefined, actions: Record<string, ServerAction>, group: GroupConfig): Promise<ServerGroup> {
    const actionsList = resolveActions(actions, group)

    if('docker' in group) {
        if(!dynamicGroupManager) {
            throw new Error("Docker support not available")
        }
        const template = dynamicGroupManager.getTemplate(group.docker.template)
        if(!template) throw new Error(`Group docker template ${group.docker.template} not found`)

        if(group.docker.custom) {
            return new CustomServerGroup(dynamicGroupManager, group, template, actionsList)
        } else {
            return new DynamicServerGroup(dynamicGroupManager, group, template, actionsList)
        }
    } else if('servers' in group) {
        const instance = new StandardServerGroup(group, actionsList)
        for(const [id, server] of Object.entries(group.servers)) {
            await instance.Create(id, server)
        }
        return instance
    }
    throw new Error("Invalid group configuration")
}

function resolveActions(actions: Record<string, ServerAction>, group: GroupConfig): ServerAction[] {
    const list: ServerAction[] = []
    for(const actionId of group.actionsIds) {
        if(actions[actionId]) {
            list.push(actions[actionId])
        } else {
            log.warn(`Group ${group.id}: unknown action ${actionId}`)
        }
    }
    return list
}