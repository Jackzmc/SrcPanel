import { LiveDataCache } from "./Live.js"


export interface ServerStatus {
    data?: {
      players: string[],
      maxplayers: number,
      map: string,
      gamemode: string,
    },
    online: boolean
}
  

export type PlayerAction = "kick"


export interface GroupInfo {
    id: string,
    name: string,
    type: ServerType
}

export interface ServerInfo {
    id?: string,
    name: string,
    domain?: string,
    port: number,
    type: string,
    ip: string,
}

export interface ServerData {
    live: LiveDataCache,
    cvars: Record<string, string>,
    playerCounts: PlayerStats[],
    playerJoins: { server: string, type: string, timestamp: number, count: number}[],
    configs: any[]
}

export interface PlayerStats {
    timestamp: number,
    count: number
}
  
export interface ExportGroupInfo extends GroupInfo {
    servers: Record<string, ServerInfo>
}


export interface GroupedServer {
    name: string,
    ip: string,
    group: string,
    port: number,
    type: string,
    tags: string[],
    domain: string,
    id: string,
    status: ServerStatus,
    sortOrder: number
}

export type ServerType = "source" | "left4dead2" | "minecraft"

export const SERVER_TYPE_MAP = {
    "left4dead2": "source"
}

export interface ServerGroup {
    id: string,
    name: string,
    servers: Record<string, GroupedServer>,
    type: ServerType
}

export type BuiltInActions = "builtin:stop" | "builtin:request_stop" | "builtin:update"