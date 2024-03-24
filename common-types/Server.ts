import { LiveDataCache } from "./Live.js"

export type PlayerAction = "kick"


export interface GroupInfo {
    name: string,
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

