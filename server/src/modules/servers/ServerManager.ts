import { mkdir, readFile, stat } from 'fs/promises'
import Json5 from 'json5'
import DNS from 'dns'
import Server, { ConfigServerData } from './Server.js'
import Share from '../Share.js';
import path, { join } from 'path';
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import SteamAPI from '../steam.js'
import { ShareDestinations, ShareInfo } from '../../../../common-types/Share.js'
import ConfigManager from '../ConfigManager.js'
import { GroupInfo, ServerAction, ServerType, SERVER_TYPE_MAP } from '../../../../common-types/Server.js'
import net from 'net'
import { LiveRecordType, LiveRecordGame, LiveRecord, LiveRecordResponse, LiveRecordSurvivor, LiveRecordPlayer, LiveRecordInfected, LiveRecordFinaleInfo, LiveRecordSurvivorItems, LiveRecordCommandResponse, PluginTokenPayload } from '../../../../common-types/Live.js';
import BufferReader from '../BufferReader.js';

// How long after no status requests to switch from short to long refresh
const SHORT_REFRESH_TIMEOUT = 1000 * 60

const LIVE_SOCKET_KEEPALIVE_INTERVAL = 1000 * 60 * 2

export interface ConfigGroupData {
  servers: Record<string, ConfigServerData>,
  type: ServerType
  name?: string,
  actions?: ServerAction[]
}
// BECAUSE FOR SOME **** REASON THIS ISNT LOADING HERE:
import dotenv from 'dotenv'
import PluginSocket from './PluginSocket.js';
import JWT from '../../jwt-promise.js';
dotenv.config()
const DEBUG_LIVE_SOCKET = process.env.DEBUG_LIVE_SOCKET != undefined

export default class ServerManager {
  private servers: Record<string, Server> = {}
  private addonShares: Record<string, Share> = {}

  private dataDir: string;
  private configDir: string;
  #steam: SteamAPI

  private shortRefreshInterval: number
  private longRefreshInterval: number
  private refreshTimer: ReturnType<typeof setTimeout>
  private refreshTimeout: ReturnType<typeof setTimeout> = null

  private groups: Record<string, GroupInfo> = {}

  #cfgManager: ConfigManager
  #socket: net.Server
  #socketClients: Map<string, PluginSocket>
  // Maps a server to a specific connection, this assumes there should never be more than one socket per server

  constructor(steam: SteamAPI, dataDir: string, configDir: string, configManager: ConfigManager) {
    this.#steam = steam
    this.dataDir = dataDir
    this.configDir = configDir
    this.#cfgManager = configManager
    this.load()
      .then(() => {
        this.refresh()
        this.refreshTimer = setInterval(() => this.refresh(), this.longRefreshInterval)
        this.#createLiveServer()
      })
  }

  #debugLive(...args: any[]) {
    if(DEBUG_LIVE_SOCKET)
      console.debug("[ServerManager::Live]",...args)
  }

  #authenticateSocket(client: PluginSocket, reader: BufferReader) {
    const size = reader.readShort()
    console.log("auth", size, reader.buffer.toString('hex'))
    const record = PluginSocket.ParseRecord(reader)
    // skip any other type until authenticated
    if(record.type != LiveRecordType.Auth) return console.warn("[ServerManager] Got non-auth packets when not-authenticated, ignoring")
    JWT.verify<PluginTokenPayload>(record.token, process.env.STATE_SECRET)
      .then(({payload}) => {
        const server = this.servers[payload.sub]
        if(server) {
          client._setServer(server)
          server._setSocket(client)
          client.send(LiveRecordResponse.OK, server.liveViewers)
          this.#debugLive("Authenticated", client.IP)
        } else {
          client.send(LiveRecordResponse.Error, "Invalid or unknown server: " + payload.sub)
          return
        }
      })
      .catch(err => {
        console.error("[ServerManager] Auth Error: ", err)
        client.send(LiveRecordResponse.Error, err.message)
      })
  }

  #onLiveClient(client: net.Socket) {
    this.#debugLive('client connected', client.remoteAddress)
    const ps = new PluginSocket(client)
    this.#socketClients.set(client.remoteAddress, ps)

    client.on('data', (buf) => {
      // If we aren't authenticate, check to see if it's valid:
      const packetReader = new BufferReader(buf)
      if(!ps.Authenticated) {
        try {
          return this.#authenticateSocket(ps, packetReader);
        } catch(err) {
          console.error("[ServerManager] Bad Auth:", err);
          return
        }
      }

      for(const reader of packetReader.readRecords()) {
        if(reader.length == 0) break
        try {
          const record = PluginSocket.ParseRecord(reader)
          if(record.type === LiveRecordType.Meta) {
            this.#steam.SteamAvailable = record.steamConnected
          }

          ps.onRecord(record)
        } catch(err) {
          console.warn(`[ServerManager] bad packet: ${err}\nbuffer: ${reader.buffer.toString('hex')}`)
          continue
        }
      }
    })

    client.on('close', () => {
      const server = ps.Server
      server?._setSocket(null) // server may be null (connected but not authenticated)
      ps._setServer(null)
      this.#socketClients.delete(client.remoteAddress)
      this.#debugLive('client disconnected', client.remoteAddress)
    })
  }

  #createLiveServer() {
    this.#socketClients = new Map()
    const liveHost = process.env.PLUGIN_SOCKET_HOSTNAME || "127.0.0.1";
    const livePort = process.env.PLUGIN_SOCKET_PORT ? parseInt(process.env.PLUGIN_SOCKET_PORT) ?? 7888 : 7888
    this.#socket = net.createServer(this.#onLiveClient.bind(this))
      .on('error', (err) => {
        // socket.send(SocketResponse.Error.toString())
        console.error(`[ServerManager::Live] Live server error: \n${err}`)
      })

      .listen(livePort, liveHost, () => {
        console.info(`[ServerManager::Live] Live server listening on ${liveHost}:${livePort}`)
      })

    // Periodically send out packets to hopefully keep it alive, and let the other end know we are here
    setInterval(() => {
      // Periodically have server submit it's live count, as a keep alive
      for(const server of Object.values(this.servers)) {
        server.emit("live:subscribe")
      }
    }, LIVE_SOCKET_KEEPALIVE_INTERVAL)
  }

  onShutdown() {
    if(this.#socket) {
      for(const client of this.#socketClients.values()) {
        client.send(LiveRecordResponse.Reconnect)
      }
      this.#socket.close()
    }

    for(const server of Object.values(this.servers)) {
      server.pushLiveRecord(null)
    }
  }

  /**
   * Gets all servers sorted by their sortOrder
   * @returns Server[]
   */
  public getAll() {
    return Object.values(this.servers)
      .sort(this.sortServer)
  }

  /**
   * Returns all servers grouped by their group
   * @param mapFn Function to map the individual server's data (only include what you need)
   * @returns Record<string, GroupInfo | {servers: Server[]}>
   */
  public getAllGrouped<T>(mapFn: (value: Server) => (T)) {
    return Object.entries(this.groups).map(([groupId, data]) => {
      return {
        id: groupId,
        name: data.name,
        type: SERVER_TYPE_MAP[data.type] ?? data.type,
        servers: Object.fromEntries(Object.entries(this.servers)
          .filter(([, server]) => server.group.id === groupId)
          .sort(([gid1,server1],[gid2,server2]) => this.sortServer(server1, server2))
          .map(([gid,server]) => [gid, mapFn(server)] )
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
  public get(key: string) {
    return this.servers[key.toLowerCase()]
  }

  /**
   * Refreshes all servers at once
   */
  public async refresh() {
    await Promise.allSettled(Object.values(this.servers).map(server => server.refresh()))
  }

  /**
   * Marks the server has being viewed, switching to a short refresh cycle
   */
  public resetInactivity() {
    const inShortRefresh = this.refreshTimeout != null
    // Kill the inactivity timeout if there was a request
    if(inShortRefresh) {
      clearTimeout(this.refreshTimeout)
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
    return this.addonShares[shareId.toLowerCase()] != undefined
  }

  public getShare(shareId: string) {
    return this.addonShares[shareId.toLowerCase()]
  }

  public get shares() {
    return Object.values(this.addonShares).map(share => share.export())
  }

  public get shareIds() { 
    return Object.keys(this.addonShares)
  }

  /**
   * Loads all servers and shares from their respective json files
   */
  private async load() {
    this.longRefreshInterval = await this.#cfgManager.GetKV<number>("servers.long_refresh_interval", 600)
    this.shortRefreshInterval = await this.#cfgManager.GetKV<number>("servers.short_refresh_interval", 30)
    try {
      const servers = await readFile(path.join(this.configDir, "servers.json"), 'utf-8')
      await this.loadServers(Json5.parse(servers))

      try {
        const shares = await readFile(path.join(this.configDir, "shares.json"), 'utf-8')
        await this.loadShares(Json5.parse(shares))
      } catch(err) {
        if(err.code !== "ENOENT") {
          throw err
        } else {
          console.warn("[Warn] No shares.json file found, no shares will be loaded.", err.message)
        }
      }
    } catch(err) {
      if(err.code !== "ENOENT") {
        throw err
      } else {
        console.warn("[Warn] No servers.json file found, no servers or shares will be loaded.", err.message)
      }
    }
  }

  
  private async loadShares(shares: any) {
    if(!shares) {
      console.warn("[Warn] No shares to load")
      return
    }

    try {
      await mkdir(join(this.dataDir, "shares"))
    } catch(err) {
      if(err.code != "EEXIST") throw err
    }

    let numServers = 0

    for(const shareId in shares) {
      let share = shares[shareId] as Partial<ShareInfo>
      share.id = shareId
      if(!share.sourceFolder) {
        console.warn(`[ServerManager] WARN: Skipping share \"${shareId}\": Missing property 'sourceFolder' in config`)
        continue
      }
      
      if(!await doesFileExist(share.sourceFolder)) {
        console.warn(`[ServerManager] WARN: Share \"${shareId}\": source folder does not exist (ENOENT)`)
      }

      const destinations = share.destinations as ShareDestinations || {}
      shareLoop:
      for(let [destKey, dest] of Object.entries(destinations)) {
        if(!dest.paths || dest.paths.length === 0) {
          console.warn(`[ServerManager] WARN: Share ${shareId}/${destKey} has no paths; skipping`)
          continue shareLoop;
        }
        for(const path of dest.paths) {
          if(!await doesFileExist(path)) {
            console.warn(`[ServerManager] WARN: Share ${shareId}/${destKey} has invalid path "${path}" (ENOENT)`)
          }
        }
        if(dest.serverIds) {
          const serverIds = []
          for(const id of dest.serverIds) {
            const _id = id.toLowerCase()
            if(this.servers[_id]) {
              serverIds.push(_id)
              numServers++
            } else {
              console.warn(`[ServerManager] WARN: Share ${shareId}/${destKey} includes non existent server id "${_id}"; skipping`)
              continue shareLoop;
            }
          }
          dest.serverIds = serverIds
        }
      }

      const db = await open({
        filename: join(this.dataDir, `shares/${shareId.toLowerCase()}_cache.db`),
        driver: sqlite3.Database
      })
      this.addonShares[shareId.toLowerCase()] = new Share(db, this.#steam, share)
      console.info(`[ServerManager] Loaded share "${shareId}" with ${Object.keys(share.destinations).length} destinations, ${numServers} servers`)
    }

    if(!shares["default"]) {
      console.warn("Warn: No default share found (no key named \"default\")")
    }
  }

  private async loadServers(config: any) {

    this.shortRefreshInterval = 1000 * (config['shortRefreshIntervalSeconds'] ?? 60)
    this.longRefreshInterval = 1000 * (config['longRefreshIntervalSeconds'] ?? 60)

    const serverPromises = []
    for(const [groupId, data] of Object.entries<ConfigGroupData>(config)) {
      this.groups[groupId] = {
        id: groupId,
        name: data.name ?? groupId,
        type: data.type || "source",
        actions: data.actions ?? []
      }
      for (const [id, server] of Object.entries<ConfigServerData>(data.servers)) {
        if(!server.name) {
          console.warn(`[ServerManager] WARN: Skipping ${id}: Server has no name`)
        } else if(!server.type) {
          console.warn(`[ServerManager] WARN: Skipping ${id}: ${server.name} has no type`)
        } else if(!server.ip) {
          console.warn(`[ServerManager] WARN: Skipping ${id}: ${server.name} has no ip`)
        } else {
          const [, host, port] = server.ip.match(/([a-zA-Z0-9.]+):?(\d*)/)
          serverPromises.push(new Promise((resolve, reject) => {
            DNS.lookup(host, { verbatim: false}, (err, address, family) => {
              if (err) {
                console.warn(`[ServerManager] Warn: Could not resolve IP for hostname ${host}:\n`, err)
              }

              const tags = server.tags ?? []

              this.servers[id] = new Server(this.groups[groupId], {
                actions: server.actions ?? [],
                id,
                name: server.name,
                domain: host,
                port: Number(port) ?? 27015,
                ip: address ?? null,
                type: server.type,
                tags: tags,
                cfgDirectory: server.cfgDirectory,
                logsPath: server.logsPath,
                activityId: server.activityId,
                rcon: server.rcon,
                systemd: server.systemd,
                sortOrder: server.sortOrder
              })
              resolve(true)
            })
          }))
        }
      }
    }

    const startTime = Date.now()
    await Promise.allSettled(serverPromises)
    const endTime = Date.now() - startTime

    console.log(`[ServerManager] Loaded ${Object.keys(this.servers).length} servers in ${endTime.toFixed(1)} ms`)
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