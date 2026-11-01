import type { LiveDataCache } from "./Live.js"

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
  game: string,
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
  name?: string,
  host?: string,
  ip: string,
  port: number,
  /** @deprecated use 'game' */
  type?: string,
  game: string,
}

export interface ServerDetailed {
  server: ServerInfo
  live: LiveDataCache | null,
  uptime: number | null,
  startTime: number | null,
  configs: null | any[],
  voiceMembers: null | VoiceUser[],
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
  version: string | null,
  appid: number | null,
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
  game: string,
  templateId?: string
}

export interface ServerAction {
  name: string,
  command: string,
  permission?: string,
  color?: string,
  isHidden?: boolean,
  description?: string,

  inherited?: boolean,
  showWhen?: "any" | "online" | "offline",
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
export interface APIListServersV2_GroupEntry {
  name: string,
  game?: string
}
export interface APIListServerGroup {
  id: string,
  name: string,
  currentInstances: number,
  /** A group might not have a game attached, but its servers will */
  game?: string,
  /** server type NOT game - docker, custom, list **/
  type: string
}

export type APIListServersV2_Groups = Record<string, APIListServersV2_GroupEntry>
export interface APIListServersV2_Server extends APIListServersCompactV2_Server {
  name: string,
  tags: string[],
  actions: ServerAction[],
  game: string
  host: string,
  port: number
}
export interface APIListServersV1_Compact {
  id: string,
  groupId: string,
  name: string
}
export interface APIListServersCompactV2_Server {
  id: string,
  groupId: string,
  status: ServerStatus,
  online: boolean,
}
export interface APIListServersV2 {
  groups: APIListServersV2_Groups,
  servers: APIListServersV2_Server[]
}
export interface APIListServersCompactV2 {
  servers: APIListServersCompactV2_Server[]
}
export type GAME_TYPE = "source" | "minecraft" | "other"
export const GAME_TYPE_MAP: Record<string, GAME_TYPE> = {
  l4d2: "source",
  tf2: "source",
  csgo: "source",
  cs2: "source",
  minecraft: "minecraft"
}
export const GAME_TYPE_CONFIG: { [key: string]: { hasMap: boolean } } = {
  ["source"]: { hasMap: true },
}

export type APIListServersV1 = APIListServersV1_Group[]
export interface APIListServersV1_Group {
  id: string,
  name?: string,
  description?: string,
  game: string,
  templateId?: string,
  servers: Record<string, APIListServersV1_Server>
}

export interface APIListServersV1_Server {
  name?: string,
  host: string,
  ip: string,
  port: number,
  type: string,
  tags: string[],
  features: ServerAvailableFeatures,
  domain: string,
  id: string,
  status: ServerStatus,
  sortOrder: number,
  actions: ServerAction[],
  online: boolean
}

export type APICreateGroupInstanceResult = APICreateGroupInstanceResult_Ok | APICreateGroupInstanceResult_Error
export type APICreateGroupInstanceResult_Error = APICreateGroupInstanceResult_BaseError | APICreateGroupInstanceResult_ErrorCPU | APICreateGroupInstanceResult_ErrorMemory

export interface APICreateGroupInstanceResult_Ok {
    id: string,
    name?: string,
    serverId: string,
    hostname?: string,
    ip: string,
    port: number,
    type: string
}

export interface APICreateGroupInstanceResult_BaseError {
    error: string,
    message: string
}

export interface APICreateGroupInstanceResult_ErrorCPU {
    error: "NO_FREE_RESOURCES" | string,
    type: "CPU",
    cpu: {
        avgLoad: number,
        currentLoad: number,
        threshold: number
    },
    message: string
}

export interface APICreateGroupInstanceResult_ErrorMemory {
    error: "NO_FREE_RESOURCES" | string,
    type: "MEMORY",
    memory: {
        available: number,
        total: number,
        percentAvailable: number,
        threshold: number
    },
    message: string
}

export type BulkActionResult = "failed" | "success" | "no_permission" | "invalid"