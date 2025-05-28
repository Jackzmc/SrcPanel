import { LiveDataCache } from "./Live.js"

export interface VoiceUser {
    id: string,
    name: string,
}

export type ServerStatusSource = "" | "live" | "gamedig"
export interface ServerStatus {
    source?: ServerStatusSource,
    data: ServerStatusData | null,
    lastStatusTime: number | null,
    lastEmptyTime: number | null
}
export interface ServerStatusData {
    players: string[],
    maxplayers: number,
    map: string,
    gamemode: string,
}
  
export interface ComputeStats {
    collectionTime: number,
    memory_stats: MemoryStats | null;
    cpu_stats: CPUStats | null;
    // Key is the network interface
    network_stats: Record<string, NetworkStats>
}


export interface CPUStats {
    cpu_usage: number;
    online_cpus: number;
}

interface MemoryStats {
    usage: number;
    usage_percent: number;
    limit: number;
}
export interface NetworkStats {
    bytesRxTotal: number,
    bytesTxTotal: number,

    bytesRxRate: number,
    bytesTxRate: number,

    packetsRx: number,
    packetsTx: number,

    droppedTx: number,
    droppedRx: number,
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
    host?: string,
    ip: string,
    port: number,
    type: string,
}

export interface ServerDetailed {
    server: ServerInfo
    live: LiveDataCache | null,
    uptime: number | null,
    startTime: number | null,
    configs: null | any[],
    voiceMembers: null | VoiceUser[]
}

export interface PlayerStats {
    timestamp: number,
    count: number
}
  
export interface ServerInfo extends ServerData {
    tags: string[],
    features: ServerAvailableFeatures
    status: ServerStatus,
    online: boolean,
    sortOrder: number,
    actions: ServerAction[],
}

export type ServerType = "source" | "left4dead2" | "minecraft"

export const SERVER_TYPE_MAP = {
    "left4dead2": "source",
    "l4d2": "source"
}

export interface ServerGroup {
    id: string,
    name: string,
    description: string,
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
    showWhen: "any" | "online" | "offline",
    requiresFeatures?: string[],
    inQuickAction?: boolean
}
export type BuiltInActions = "builtin:stop" | "builtin:request_stop" | "builtin:update" | "builtin:kick"

export interface ServerAvailableFeatures {
    rcon: boolean
    logs: boolean
    configs: boolean
    plugin: boolean,
    docker: boolean,
    metrics: boolean

    performCommands: boolean,
    canStart: boolean
} 
export type ServerFeature = keyof ServerAvailableFeatures
export enum ServerState {
    Offline = 0,
    Online = 1,
    Starting = 2,
    Stopping = 3,
    Updating = 4
  }
export interface APIListServersV2_GroupEntry {
    name: string,
    game: string
}
export interface APIListServerGroup {
    id: string,
    name: string,
    currentInstances: number,
    game: string
}

export type APIListServersV2_Groups = Record<string, APIListServersV2_GroupEntry>
export interface APIListServersV2_Server {
    id: string,
    name: string,
    groupId: string,
    status: ServerStatus,
    tags: string[],
    actions: ServerAction[],
    host: string,
    port: number
}
export interface APIListServersV2 {
    groups: APIListServersV2_Groups,
    servers: APIListServersV2_Server[]
}