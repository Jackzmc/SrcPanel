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
    type: ServerType,
    actions?: ServerAction[]

}

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
  
export interface ExportGroupInfo extends GroupInfo {
    servers: Record<string, ServerData>
}


export interface ServerInfo extends ServerData {
    tags: string[],
    features: string[]
    status: ServerStatus,
    sortOrder: number,
    actions: ServerAction[],
}

export type ServerType = "source" | "left4dead2" | "minecraft"

export const SERVER_TYPE_MAP = {
    "left4dead2": "source"
}

export interface ServerGroup {
    id: string,
    name: string,
    servers: Record<string, ServerInfo>,
    type: ServerType
}

export interface ServerAction {
    name: string,
    command: string,
    permission?: string,
    color?: string,
    isHidden: boolean,
    description?: string
}
export type BuiltInActions = "builtin:stop" | "builtin:request_stop" | "builtin:update"
