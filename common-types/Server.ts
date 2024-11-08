import { LiveDataCache } from "./Live.js"


export interface ServerStatus {
    source?: "live" | "gamedig",
    data?: {
      players: string[],
      maxplayers: number,
      map: string,
      gamemode: string,
    },
    online: boolean
}
  

export type PlayerAction = "kick"


interface BaseGroupInfo {
    id: string,
    name: string,
    type: ServerType,
    actions?: ServerAction[]
}
export interface StandardGroupInfo extends BaseGroupInfo {

}
export interface DynamicGroupInfo extends BaseGroupInfo {
    templateId: string,
    serverTemplate?: {
        name: string,
        ip: string,
        activityId?: string,
        tags?: string[]
    },
    minServers?: boolean
}
export type GroupInfo = StandardGroupInfo | DynamicGroupInfo

export interface ServerData {
    id: string,
    name: string,
    domain?: string,
    port: number,
    type: string,
    ip: string,
}

export interface ServerDetailed {
    server: ServerInfo
    live: LiveDataCache,
    uptime: number
    cvars: Record<string, string>,
    playerCounts: PlayerStats[],
    playerJoins: { server: string, type: string, timestamp: number, count: number}[],
    configs: any[]
}

export interface PlayerStats {
    timestamp: number,
    count: number
}
  
export interface ServerInfo extends ServerData {
    tags: string[],
    features: ServerAvailableFeatures
    status?: ServerStatus,
    sortOrder: number,
    actions: ServerAction[],
}

export type ServerType = "source" | "left4dead2" | "minecraft"

export const SERVER_TYPE_MAP = {
    "left4dead2": "source"
    "l4d2": "source"
}

export interface ServerGroup {
    id: string,
    name: string,
    servers: Record<string, ServerInfo>,
    type: ServerType,
    templateId?: string
}

export interface ServerAction {
    name: string,
    command: string,
    permission?: string,
    color?: string,
    isHidden: boolean,
    description?: string,

    inherited?: boolean,
    showWhen: "any" | "online" | "offline"
}
export type BuiltInActions = "builtin:stop" | "builtin:request_stop" | "builtin:update" | "builtin:kick"

export interface ServerAvailableFeatures {
    rcon?: boolean
    console?: boolean
    configs?: boolean
    systemd?: boolean
    plugin?: boolean,
    docker?: boolean
} 
export type ServerFeature = keyof ServerAvailableFeatures