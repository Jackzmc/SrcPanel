import { mkdir, readFile, stat, open } from 'fs/promises'
import Json5 from 'json5'
import Server, { ConfigServerData } from './Server'
import Share from '../shares/Share.js';
import path, { join } from 'path';
import { open as sqliteOpen } from 'sqlite'
import sqlite3 from 'sqlite3'
import SteamAPI from '../steam.js'
import { ShareDestinations, ShareInfo } from '../../../../common-types/Share.js'
import ConfigManager from '../ConfigManager.js'
import { GroupInfo, ServerAction, ServerType, SERVER_TYPE_MAP, DynamicGroupInfo, StandardGroupInfo } from '../../../../common-types/Server.js'
import net from 'net'
import { LiveRecordType, LiveRecordGame, LiveRecord, LiveRecordResponse, LiveRecordSurvivor, LiveRecordClient, LiveRecordInfected, LiveRecordFinaleInfo, LiveRecordSurvivorItems, LiveRecordCommandResponse, PluginTokenPayload } from '../../../../common-types/Live.js';
import BufferReader from '../BufferReader.js';
import PluginSocket from './PluginSocket.js';
import JWT from '../../jwt-promise.js';
import { WriteStream, createWriteStream } from 'fs';
import dotenv from 'dotenv'
import { GameDig, QueryOptions } from 'gamedig';
import DynamicServerManager from './docker/DynamicServerManager.js';
import ServerGroup from './groups/ServerGroup.js';
import { DynamicServerGroup } from './groups/DynamicServerGroup.js';
import { StandardServerGroup } from './groups/StandardServerGroup.js';
import { CustomServerGroup } from './groups/CustomServerGroup.js';
import yaml from 'yaml'
import { loadShares } from '../shares/index.js';
import { loadGroups } from './groups/index.js';


// How long after no status requests to switch from short to long refresh
const SHORT_REFRESH_TIMEOUT = 1000 * 60

const LIVE_SOCKET_KEEPALIVE_INTERVAL = 1000 * 60 * 2

const MAX_SOCKET_CONNECTIONS = 40

interface BaseConfigGroupData {
  type: ServerType
  name?: string,
  actionSources?: string[]
}
export interface ConfigStandaloneGroupData extends BaseConfigGroupData {
  servers: Record<string, ConfigServerData>,
}
export interface ConfigDynamicGroupData extends BaseConfigGroupData {
  templateId: string,
  serverTemplate: ConfigServerData,
  minServers?: number
}
export type ConfigGroupData = ConfigStandaloneGroupData | ConfigDynamicGroupData


// BECAUSE FOR SOME **** REASON THIS ISNT LOADING HERE:

dotenv.config()
const DebugLivePlugin = process.env.LIVE_PLUGIN_DEBUG != undefined

let _instance: ServerManager

export default class ServerManager {
  // private servers: Record<string, Server> = {}
  private fileShares: Record<string, Share> = {}

  private dataDir: string;
  private configDir: string;
  #steam: SteamAPI

  private shortRefreshInterval: number
  private longRefreshInterval: number
  private refreshTimer: ReturnType<typeof setTimeout>
  private refreshTimeout: ReturnType<typeof setTimeout>|null = null

  #cfgManager: ConfigManager
  #socket: net.Server
  #socketClients: Map<string, PluginSocket>
  #liveErrors: WriteStream
  #dynamicManager: DynamicServerManager

  #groups: Record<string, ServerGroup> = {}
  #actions: Record<string, ServerAction> = {}
  // Maps a server to a specific connection, this assumes there should never be more than one socket per server

  constructor(steam: SteamAPI, dataDir: string, configDir: string, configManager: ConfigManager) {
    this.#steam = steam
    this.dataDir = dataDir
    this.configDir = configDir
    this.#cfgManager = configManager
    if(process.env.DOCKER_ENABLE) {
      this.#dynamicManager = new DynamicServerManager(this, configDir, {
        protocol: process.env.DOCKER_FORCE_PROTOCOL as "http" | "https" | "ssh" | undefined,
        host: process.env.DOCKER_HOST,
        port: process.env.DOCKER_PORT || 2375,
        version: process.env.DOCKER_VERSION
      })
    }

    _instance = this
  }

  public get Docker() {
    return this.#dynamicManager
  }

  public static get Instance(): ServerManager { 
    return _instance 
  }

  public static async isFileIgnored(filepath: string): Promise<boolean> {
    const configPath = path.join(ServerManager.Instance.dataDir, "server_files.ignore")
    try {
      const file = await open(configPath)
      if(!file) return false
      let result = false
      for await (const line of file.readLines()) {
    // TODO: use more advanced code, that mimics .gitignore. for now this works:
        if(line.includes(filepath)) {
          result = true
          break
        }
      }
      await file.close()
      return result
    } catch(err) {
      if(err.code == "ENOENT") return false
      throw err
    }
  }

  public get Groups() {
    return Object.values(this.#groups)
  }
  public get GroupsRecord() {
    return {...this.#groups}
  }

  #debugLive(...args: any[]) {
    if(DebugLivePlugin)
      console.debug("[ServerManager::Live]",...args)
  }

  async #authenticateSocket(client: PluginSocket, reader: BufferReader): Promise<boolean> {
    const size = reader.readShort() // We don't need size for authentication, but we need to read 2 bytes
    const record = PluginSocket.ParseRecord(reader)
    // skip any other type until authenticated
    if(record.type != LiveRecordType.Auth) {
      console.warn("[ServerManager] Got non-auth packets when not-authenticated, ignoring")
      return false
    }
    try {
      const {payload} = await JWT.verify<PluginTokenPayload>(record.token, process.env.STATE_SECRET!)
      const server = this.getServerForPlugin(payload, record.port)
      if(server) {
        client._setServer(server,)
        server.Plugin?._setSocket(client)
        if(record.gameVersion)
          server.GameVersion = record.gameVersion
        this.#debugLive("Authenticated", `host=${client.Host} server=${server.id}`)
        return true
      } else {
        client.send(LiveRecordResponse.Error, `Invalid or unknown id "${payload.sub}" (docker: ${payload.docker?'y':'n'})`)
        return false
      }
    } catch(err) {
        console.error("[ServerManager] Auth Error: ", err)
        client.send(LiveRecordResponse.Error, err.message)
        return false
    }
  }

  #onLiveClient(client: net.Socket) {
    const clientHost = `${client.remoteAddress}:${client.remotePort}`
    if(this.#socketClients.has(clientHost)) this.#debugLive("warn: client already was connected", clientHost)
    this.#debugLive('client connected', clientHost, 'waiting for auth')
    const ps = new PluginSocket(client)
    this.#socketClients.set(clientHost, ps)
    
    client.on('data', async(buf) => {
      const packetReader = new BufferReader(buf)
      // If we aren't authenticate, read packet as an authentication packet and try to authenticate
      if(!ps.Authenticated) {
        try {
          if(await this.#authenticateSocket(ps, packetReader)) {
            await ps.sendInit()
          }
        } catch(err) {
          console.error("[ServerManager] Bad Auth:", err);
        }
        return
      }

      // Multiple records can be included in a packet, this returns an iteration of buffer readers that contain records
      for(const reader of packetReader.readRecords()) {
        if(reader.length == 0) break // Sometimes a record can be empty, it shouldn't but it happens.
        
        // Try to parse the reader into a certain record
        let record
        try {
          record = PluginSocket.ParseRecord(reader)
          // Check if server reports it being disconnected from steam
          if(record.type === LiveRecordType.Meta) {
            this.#steam.SteamAvailable = record.steamConnected
          }
        } catch(err) {
          this.#liveErrors.write(`buffer: ${reader.buffer.toString('hex')}\n`)
          console.warn(`[ServerManager] bad packet: ${err}\nbuffer: ${reader.buffer.toString('hex')}`, err.stack)
          continue
        }

        ps.onRecord(record)
      }
    })

    client.on('error', (err) => {
      
    })

    client.on('close', () => {
      const server = ps.Server
      server?.Plugin?._setSocket(null)
      ps._setServer(null)
      this.#socketClients.delete(clientHost)
      this.#debugLive('client disconnected', clientHost)
    })
  }

  #createLiveServer() {
    this.#socketClients = new Map()
    this.#liveErrors = createWriteStream(path.join(this.dataDir, "live_errors.log"))
    const liveHost = process.env.LIVE_PLUGIN_HOSTNAME || "127.0.0.1";
    const livePort = process.env.LIVE_PLUGIN_PORT ? parseInt(process.env.LIVE_PLUGIN_PORT) ?? 7888 : 7888
    // Create TCP socket
    this.#socket = net.createServer({
      keepAlive : true,
    }, this.#onLiveClient.bind(this))
      .on('error', (err) => {
        // socket.send(SocketResponse.Error.toString())
        console.error(`[ServerManager::Live] Live server error: \n${err}`)
      })

      .listen(livePort, liveHost, () => {
        console.info(`[ServerManager::Live] Live server listening on ${liveHost}:${livePort}`)
      })
    this.#socket.maxConnections = MAX_SOCKET_CONNECTIONS

    // Periodically send out packets to hopefully keep it alive, and let the other end know we are here
    setInterval(() => {
      for(const server of Object.values(this.getAll())) {
        // This triggers an OK packet
        if(server.Plugin?.authenticated)
          server.Plugin.Socket?.send(LiveRecordResponse.OK, server.WebsocketViewers)
      }
    }, LIVE_SOCKET_KEEPALIVE_INTERVAL)
  }

  async onShutdown() {
    if(this.#socket) {
      // Inform all clients that we are shutting down, try to reconnect
      for(const client of this.#socketClients.values()) {
        if(client.Authenticated)
          client.send(LiveRecordResponse.Reconnect)
      }
      // Wait for socket to close:
      await new Promise((resolve) => this.#socket.close(resolve))
    }

    for(const group of Object.values(this.#groups)) {
      await group.onShutdown()
    }
  }

  /**
   * Gets all servers sorted by their sortOrder
   * @returns Server[]
   */
  public getAll() {
    const list: Server[] = []
    for(const groups of Object.values(this.#groups)) {
      for(const server of groups.Servers) {
        list.push(server)
      }
    }
    list.sort(this.sortServer)
    return list
  }

  /**
   * Returns all servers grouped by their group
   * @param mapFn Function to map the individual server's data (only include what you need)
   * @returns Record<string, GroupInfo | {servers: Server[]}>
   */
  public getAllGrouped<T>(mapFn: (value: Server) => (T)) {
    return Object.values(this.#groups)
      .map((group) => {
        let templateId: string|null = null
        if(group instanceof DynamicServerGroup) {
          templateId = group.TemplateId
        }
        return {
          id: group.Id,
          name: group.Name,
          description: group.Description,
          game: group.Game,
          templateId: templateId,
          servers: Object.fromEntries(Object.values(group.Servers)
            .sort((server1, server2) => this.sortServer(server1, server2))
            .map(server => [server.id, mapFn(server)] )
          )
        }
      })
  }

  private sortServer(a: Server, b: Server) {
    if(b.sortOrder != undefined && a.sortOrder != undefined) return a.sortOrder - b.sortOrder
    else if(b.sortOrder && !a.sortOrder) return 1
    else if(!b.sortOrder && a.sortOrder) return -1
    else return a.port - b.port
  }

  /**
   * Gets server (case-insensitive)
   * @param key 
   * @returns 
   */
  public getServer(key: string) {
    for(const group of Object.values(this.#groups)) {
      const server = group.getServer(key)
      if(server) return server
    }
    return null
  }
  public getServerForPlugin(payload: PluginTokenPayload, port: number) {
    if(!payload.docker) return this.getServer(payload.sub)
    for(const group of Object.values(this.#groups)) {
      if(group.Id === payload.sub) {
        const server = group.getServerByPort(port)
        if(server) return server
      }
    }
    return null
  }
  public getServerByContainerId(containerId: string) {
    for(const group of Object.values(this.#groups)) {
      if(group instanceof DynamicServerGroup) {
        const server = group.getServerByContainerId(containerId)
        if(server) return server
      }
    }
    return null
  }
  public getGroup(id: string) {
    return this.#groups[id]
  }
  /**
   * Refreshes all servers at once
   */
  public async refresh() {
    await Promise.allSettled(this.getAll().map(server => server.refreshStatus(false)))
  }

  /**
   * Marks the server has being viewed, switching to a short refresh cycle
   */
  public resetInactivity() {
    const inShortRefresh = this.refreshTimeout != null
    // Kill the inactivity timeout if there was a request
    if(inShortRefresh) {
      clearTimeout(this.refreshTimeout!)
    }
    this.refreshTimeout = setTimeout(() => {
      // Switch the timer from short -> long
      clearInterval(this.refreshTimer)
      this.refreshTimer = setInterval(() => this.refresh(), this.longRefreshInterval)
      this.refreshTimeout = null
    }, SHORT_REFRESH_TIMEOUT)

    // Switch the timer from long -> short
    if(!inShortRefresh) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = setInterval(() => this.refresh(), this.shortRefreshInterval)
      // Trigger a refresh now, to reduce stale data
      this.refresh()
    }
  }

  public hasShare(shareId: string) {
    return this.fileShares[shareId.toLowerCase()] != undefined
  }

  public getShare(shareId?: string) {
    if(!shareId) return undefined
    return this.fileShares[shareId.toLowerCase()]
  }

  public get shares() {
    return Object.values(this.fileShares).map(share => share.export())
  }

  public get shareIds() { 
    return Object.keys(this.fileShares)
  }

  async deleteGroup(groupId: string) {
    delete this.#groups[groupId]
  }
  async setGroup(id: string, group: string) {

  }
  async addGroup(group: string) {

  }

  async deleteServer(server: string) {

  }

  async putServer(serveR: Server) {

  }

  /**
   * Loads all servers and shares from their respective json files
   */
  
  async Load() {
    this.longRefreshInterval = await this.#cfgManager.GetKV<number>("servers.long_refresh_interval", 600)
    this.shortRefreshInterval = await this.#cfgManager.GetKV<number>("servers.short_refresh_interval", 30)
    if(this.#dynamicManager) {
      await this.#dynamicManager.Load()
    }
    this.#actions = await this.#loadActions()

    this.#groups = await loadGroups(this.configDir, this.#dynamicManager, this.#actions)


    // We don't need to await refresh
    this.#createLiveServer()
    this.refresh()
    this.refreshTimer = setInterval(() => this.refresh(), this.longRefreshInterval)

    this.fileShares = await loadShares(this.configDir, this.dataDir, this.#steam)
    console.log("[ServerManager] Done loading")
  }

  #parseAction(action: any): ServerAction {
    const requiredProperties = ["name", "command"]
    for(const prop of requiredProperties) {
      if(action[prop] == undefined) {
        throw new Error(`Action is missing property \"${prop}\" ` + JSON.stringify(action))
      }
    }
    return {
      name: action.name!,
      command: action.command!,
      isHidden: action.isHidden || false,
      showWhen: action.showWhen || 'online',
      color: action.color,
      requiresFeatures: action.requires || [],
      inQuickAction: action.inQuickAction || false
    }
  }

  // TODO: move to own file, separate parse and load
  async #loadActions(): Promise<Record<string, ServerAction>> {
    try {
      const content = await readFile(path.join(this.configDir, "actions.yml"), 'utf-8')
      const actionGroups = yaml.parse(content)

      const kv = {}

      for(const [id, data] of Object.entries<ServerAction>(actionGroups)) {
        kv[id] = this.#parseAction(data)
      }
      return kv
    } catch(err) {
      if(err.code == "ENOENT") return {}
      throw err
    }
  }

  // async #loadGroups(config: any) {
  //   const startTime = Date.now()
  //   for(const [groupId, data] of Object.entries<ConfigGroupData>(config)) {
  //     let actions: ServerAction[] = []
  //     if(data.actionSources) {
  //       // Add 'docker' action group for docker server groups
  //       if('templateId' in data) {
  //         // Resolve [id1, id2] -> [action1, action2]
  //         data.actionSources.push("docker")
  //       }
        
  //       actions = data.actionSources.reduce((list, actionGroupId) => {
  //         if(!this.#actions[actionGroupId]) {
  //           console.warn(`[ServerManager] WARN: Group ${groupId} references missing action group: ${actionGroupId}`)
  //           return list
  //         }
  //         return list.concat(this.#actions[actionGroupId])
  //       }, [] as ServerAction[])
  //     }
  //     if('templateId' in data) {
  //       if(!this.#dynamicManager) {
  //         console.warn(`[ServerManager] WARN: Found templated server config but docker support is not enabled (DOCKER_ENABLED set to 1); skipping`)
  //         continue;
  //       }
  //       if('groupType' in data && data.groupType === "custom") {
  //         const group = new CustomServerGroup(this.#dynamicManager, groupId, {
  //           name: data.name,
  //           type: data.type,
  //           actions,
  //           templateId: data.templateId,
  //           serverTemplate: data.serverTemplate,
  //         })
  //         this.#groups[groupId] = group
  //       } else {
  //         const group = new DynamicServerGroup(this.#dynamicManager, groupId, {
  //           name: data.name,
  //           type: data.type,
  //           actions,
  //           templateId: data.templateId,
  //           serverTemplate: data.serverTemplate,
  //           minServers: data.minServers
  //         })
  //         this.#groups[groupId] = group
  //       }
  //     } else if('servers' in data) {
  //       const group = new StandardServerGroup(groupId, {
  //         name: data.name,
  //         type: data.type,
  //         actions
  //       })
  //       await group.ParseServers(data.servers)
  //       this.#groups[groupId] = group
  //     } else {
  //       console.error(`[ServerManager] ERROR: Unknown group type for group \"${groupId}\" (no 'templateId' or 'servers')`)
  //     }
  //   }

  //   // await Promise.allSettled(serverPromises)
  //   const endTime = Date.now() - startTime
  //   console.log(`[ServerManager] Loaded ${Object.keys(this.#groups).length} groups and total of ${this.Count} servers in ${endTime.toFixed(1)} ms`)
  // }

  get Count() {
    let count = 0
    for(const group of Object.values(this.#groups)) {
      count += group.ServerCount
    }
    return count
  }

  async queryHost(host: string, port: number, type: string, options: Partial<QueryOptions> = {}) {
    return await GameDig.query({
      type: type,
      host,
      port,
      givenPortOnly: true,
      socketTimeout: 3000,
      attemptTimeout: 5000,
      ...options,
    })
  }
}

async function doesFileExist(filename: string) {
  try {
    await stat(filename)
    return true
  } catch(err) {
    if(err.code === "ENOENT") return false
    throw err
  }
}