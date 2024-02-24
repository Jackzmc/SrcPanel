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
import { GroupInfo } from '../../../../common-types/Server.js'

// How long after no status requests to switch from short to long refresh
const SHORT_REFRESH_TIMEOUT = 1000 * 60

export interface ConfigGroupData {
  servers: Record<string, ConfigServerData>,
  name?: string
}

export default class ServerManager {
  private servers: Record<string, Server> = {}
  private addonShares: Record<string, Share> = {}

  private dataDir: string;
  private configDir: string;
  private steam: SteamAPI

  private shortRefreshInterval: number
  private longRefreshInterval: number
  private refreshTimer: ReturnType<typeof setTimeout>
  private refreshTimeout: ReturnType<typeof setTimeout> = null

  private groups: Record<string, GroupInfo> = {}

  #cfgManager: ConfigManager

  constructor(steam: SteamAPI, dataDir: string, configDir: string, configManager: ConfigManager) {
    this.steam = steam
    this.dataDir = dataDir
    this.configDir = configDir
    this.#cfgManager = configManager
    this.load()
      .then(() => {
        this.refresh()
        this.refreshTimer = setInterval(() => this.refresh(), this.longRefreshInterval)
      })
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
        servers: Object.fromEntries(Object.entries(this.servers)
          .filter(([, server]) => server.group === groupId)
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
      this.addonShares[shareId.toLowerCase()] = new Share(db, this.steam, share)
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
        name: data.name ?? groupId
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
              if(server.systemd) tags.push('systemd')
              if(server.rcon) tags.push('rcon')

              let rconPassword = server.rcon?.password?.text
              if(server.rcon && server.rcon.password.env) {
                rconPassword = process.env[server.rcon.password.env]
              }

              this.servers[id] = new Server(groupId, {
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
                systemd: server.systemd,
                rcon: server.rcon ? {
                  password: rconPassword,
                  exitCommand: server.rcon.exitCommand || "exit",
                  requestExitCommand: server.rcon.requestExitCommand || "exit"
                } : null,
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