import { readFile, open } from 'fs/promises'
import Server, { ConfigServerData } from './Server.js'
import Share from '../shares/Share.js';
import path from 'path';
import SteamAPI from '../steam.js'
import { BulkActionResult, ServerAction, ServerType } from '@srcpanel/common/Server'
import net from 'net'
import { LiveRecordType, LiveRecordResponse,PluginTokenPayload } from '@srcpanel/common/Live';
import BufferReader from '../BufferReader.js';
import PluginSocket from './PluginSocket.js';
import JWT from '../../jwt-promise.js';
import { WriteStream, createWriteStream } from 'fs';
import dotenv from 'dotenv'
import { GameDig, QueryOptions } from 'gamedig';
import DynamicServerManager from './docker/DynamicServerManager.js';
import ServerGroup from './groups/ServerGroup.js';
import { DynamicServerGroup } from './groups/DynamicServerGroup.js';
import yaml from 'yaml'
import { loadShares } from '../shares/index.js';
import { loadGroups } from './groups/index.js';
import logger from '../../logger.js'
import { METRIC_SERVERS_LIVE_AUTH_COUNT } from '../../core/prom-metrics.js';
import User from '../users/User.js';
import { UserPrivilegeCode } from '@srcpanel/common/Privileges';
const log = logger.child({ name: "ServerManager" })
const liveLog = log.child({ name: "ServerManager/Live" })


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

dotenv.config({ quiet: true })
const DebugLivePlugin = process.env.LIVE_PLUGIN_DEBUG != undefined

export default class ServerManager {
  // private servers: Record<string, Server> = {}
  private fileShares: Record<string, Share> = {}

  private dataDir: string;
  private configDir: string;
  #steam: SteamAPI

  private shortRefreshInterval: number
  private longRefreshInterval: number
  private refreshTimer: ReturnType<typeof setTimeout>|undefined = undefined
  private refreshTimeout: ReturnType<typeof setTimeout>|null = null

  #socket: net.Server|undefined = undefined
  #socketClients: Map<string, PluginSocket> = new Map()
  #liveErrors: WriteStream | undefined = undefined
  #dynamicManager: DynamicServerManager | undefined

  #groups: Record<string, ServerGroup> = {}
  #actions: Record<string, ServerAction> = {}

  static #instance: ServerManager
  // Maps a server to a specific connection, this assumes there should never be more than one socket per server

  constructor(steam: SteamAPI, dataDir: string, configDir: string) {
    this.longRefreshInterval = 600 // await this.#cfgManager.GetKV<number>("servers.long_refresh_interval", 600)
    this.shortRefreshInterval = 30 // await this.#cfgManager.GetKV<number>("servers.short_refresh_interval", 30)
    this.#steam = steam
    this.dataDir = dataDir
    this.configDir = configDir
    if(process.env.DOCKER_ENABLE == "1" || process.env.DOCKER_ENABLE === "true") {
      log.debug("Docker enabled, initalzing dynamic server manager")
      this.#dynamicManager = new DynamicServerManager(this, configDir, {
        protocol: process.env.DOCKER_FORCE_PROTOCOL as "http" | "https" | "ssh" | undefined,
        host: process.env.DOCKER_HOST,
        port: process.env.DOCKER_PORT || 2375,
        version: process.env.DOCKER_VERSION
      })
    }
    ServerManager.#instance = this
  }

  public get Docker() {
    return this.#dynamicManager
  }

  public static get Instance(): ServerManager { 
    return ServerManager.#instance 
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
    } catch(err: any) {
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

  async #authenticateSocket(client: PluginSocket, reader: BufferReader): Promise<boolean> {
    const _ = reader.readShort() // We don't need size for authentication, but we need to read 2 bytes
    const record = PluginSocket.ParseRecord(reader)
    // skip any other type until authenticated
    if(record.type != LiveRecordType.Auth) {
      log.warn("Got non-auth packets when not-authenticated, ignoring")
      return false
    }
    try {
      const {payload} = await JWT.verify<PluginTokenPayload>(record.token, process.env.STATE_SECRET!)
      const server = this.getServerForPlugin(payload, record.port)
      if(server) {
        client._setServer(server,)
        server.Plugin?._setSocket(client)
        server._setGameInfo(record.appid, record.gameVersion)
        liveLog.info({ host: client.Host, server: server.id, appid: `${record.appid}/${record.gameVersion}`}, 'authenticated')
        METRIC_SERVERS_LIVE_AUTH_COUNT.inc({ appid: record.appid, game_version: record.gameVersion })
        return true
      } else {
        client.send(LiveRecordResponse.Error, `Invalid or unknown id "${payload.sub}" (docker: ${payload.docker?'y':'n'})`)
        return false
      }
    } catch(err: any) {
        log.error("Live auth Error: ", err)
        client.send(LiveRecordResponse.Error, err.message)
        return false
    }
  }

  #onLiveClient(client: net.Socket) {
    const clientHost = `${client.remoteAddress}:${client.remotePort}`
    if(this.#socketClients.has(clientHost)) liveLog.warn({ clientHost }, 'client already was connected')
    liveLog.debug({ clientHost}, 'client connected - pending auth')
    const ps = new PluginSocket(client)
    this.#socketClients.set(clientHost, ps)
    
    client.on('data', async(buf) => {
      if(typeof buf == "string") throw new Error("Invalid encoding")
      const packetReader = new BufferReader(buf)
      // If we aren't authenticate, read packet as an authentication packet and try to authenticate
      if(!ps.Authenticated) {
        try {
          if(await this.#authenticateSocket(ps, packetReader)) {
            await ps.sendInit()
          }
        } catch(err: any) {
          log.error("Bad live auth:", err);
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
        } catch(err: any) {
          this.#liveErrors?.write(`buffer: ${reader.buffer.toString('hex')}\n`)
          liveLog.warn(`bad packet: ${err}\nbuffer: ${reader.buffer.toString('hex')}`, err.stack)
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
      liveLog.info({ clientHost}, 'client disconnected')
    })
  }

  #createLiveServer() {
    this.#liveErrors = createWriteStream(path.join(this.dataDir, "live_errors.log"))
    const liveHost = process.env.LIVE_PLUGIN_HOSTNAME || "127.0.0.1";
    const livePort = process.env.LIVE_PLUGIN_PORT ? parseInt(process.env.LIVE_PLUGIN_PORT) ?? 7888 : 7888
    // Create TCP socket
    this.#socket = net.createServer({
      keepAlive : true,
    }, this.#onLiveClient.bind(this))
      .on('error', (err) => {
        // socket.send(SocketResponse.Error.toString())
        liveLog.error(`server error: \n${err}`)
      })

      .listen(livePort, liveHost, () => {
        liveLog.info(`server listening on ${liveHost}:${livePort}`)
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
      await new Promise((resolve) => this.#socket?.close(resolve))
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
  public getGroup(id: string): ServerGroup | undefined {
    return this.#groups[id]
  }
  /**
   * Refreshes all servers at once
   */
  public async refresh() {
    await Promise.allSettled(this.getAll().map(server => server.update(false)))
  }

  /**
   * Request a list of targetIds ('groupId' or 'groupId/serverId') to be restarted
   * 
   * Group ids perform action on all servers in group
   * 
   * @param targets list of targets
   * @param action action to run
   * @param namespace namespace to run action on
   * @returns results of target { targetId: "failed" | "invalid" | "success" }
   */
  async performActionBulk(targets: string[], action: string, namespace: string, runAsUser?: User): Promise<Record<string, BulkActionResult>> {
    const results: Record<string, BulkActionResult> = {}
    const promises: Promise<void>[] = []
    for(const target of targets) {
      results[target] = "failed"
      const [groupId,serverId] = target.split("/")
      const group = this.getGroup(groupId)
      if(!group) {
        results[target] = "invalid"
        continue
      }

      if(serverId) {
        const server = group.getServer(serverId)
        if (!server) {
          results[target] = "invalid"
          continue
        }
        promises.push((async() => {
          try {
            await server.performAction(action, namespace, runAsUser)
            results[target] = "success"
          } catch(err) {
            log.warn({ target, namespace, action }, "action failed")
          }
        })())
      } else {
        promises.push((async() => {
          try {
            await group.performActionAll(action, namespace, runAsUser)
            results[target] = "success"
          } catch(err) {
            log.warn({ target, namespace, action }, "action failed")
          }
        })())
      }
      
    }

    await Promise.allSettled(promises)
    return results
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

  /**
   * Loads all servers and shares from their respective json files
   */
  
  async Load() {
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
    log.info("Done loading")
  }

  #parseAction(action: any): ServerAction {
    const requiredProperties = ["name", "command"]
    for(const prop of requiredProperties) {
      if(action[prop] == undefined) {
        throw new Error(`Action is missing property "${prop}" ` + JSON.stringify(action))
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
    } catch(err: any) {
      if(err.code == "ENOENT") return {}
      throw err
    }
  }

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