import { readFileSync } from 'fs'
import { mkdir, readFile, stat } from 'fs/promises'
import Json5 from 'json5'
import DNS from 'dns'
import Server, { ConfigServerData } from './Server.js'
import Share from '../Share.js';
import path, { join } from 'path';
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import SteamAPI from '../steam.js'
import { ShareDestination, ShareDestinations, ShareInfo } from '../../../../common-types/Share.js'
import ConfigManager from '../ConfigManager.js'

// How long after no status requests to switch from short to long refresh
const SHORT_REFRESH_TIMEOUT = 1000 * 60

export default class ServerManager {
  private servers: Record<string, Server> = {}
  private addonShares: Record<string, Share> = {}

  private dataDir: string;
  private configDir: string;
  private steam: SteamAPI

  private shortRefreshInterval: number
  private longRefreshInterval: number
  private refreshTimer: NodeJS.Timer
  private refreshTimeout: NodeJS.Timer = null

  private cfgManger: ConfigManager

  constructor(steam: SteamAPI, dataDir: string, configDir: string, configManager: ConfigManager) {
    this.steam = steam
    this.dataDir = dataDir
    this.configDir = configDir
    this.cfgManger = configManager
    this.load()
      .then(() => {
        this.refresh()
        this.refreshTimer = setInterval(() => this.refresh(), this.longRefreshInterval)
      })
  }

  public getAll() {
    return Object.values(this.servers)
      .sort((a,b) => {
        if(b.sortOrder != undefined && a.sortOrder != undefined) return a.sortOrder - b.sortOrder
        else if(b.sortOrder && !a.sortOrder) return 1
        else if(!b.sortOrder && a.sortOrder) return -1
        else return a.port - b.port
      })
  }

  get HasViewers() {
    return this.refreshTimeout != null
  }

  public get(key: string) {
    return this.servers[key.toLowerCase()]
  }

  public async refresh() {
    await Promise.allSettled(Object.values(this.servers).map(server => server.refresh()))
  }

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

  private async load() {
    try {
      const servers = await readFile(path.join(this.configDir, "servers.json"), 'utf-8')
      const config = Json5.parse(servers)
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


    for(const shareId in shares) {
      let share = shares[shareId] as Partial<ShareInfo>
      share.id = shareId
      if(!share.sourceFolder) {
        console.warn(`[Warn] Skipping share \"${shareId}\": Missing property 'sourceFolder' in config`)
        continue
      }

      try {
        await stat(share.sourceFolder)
        const destinations = share.destinations as ShareDestinations || {}
        for(let [destKey, dest] of Object.entries(destinations)) {
          try {
            await stat(dest.path)
            if(dest.serverIds) {
              const serverIds = []
              for(const id of dest.serverIds) {
                const _id = id.toLowerCase()
                if(this.servers[_id]) {
                  serverIds.push(_id)
                } else {
                  console.warn(`[Warn] Addon Share "${shareId}" destination "${destKey}" includes non existent server id: "${_id}"; skipping`)
                }
              }
              dest.serverIds = serverIds
            }
          } catch(err) {
            console.warn(`[Warn] Share "${shareId}" destination "${destKey}" path is invalid: "${dest.path}"`, err)
          }
        }
        const db = await open({
          filename: join(this.dataDir, `shares/${shareId.toLowerCase()}_cache.db`),
          driver: sqlite3.Database
        })
        this.addonShares[shareId.toLowerCase()] = new Share(db, this.steam, share)
        console.info(`Loaded share "${shareId}"`)
      } catch(err) {
        console.warn(`Share Directory "${shareId}" returned error: ${err}`)
      }
    }

    if(!shares["default"]) {
      console.warn("Warn: No default share found (no key named \"default\")")
    }
  }

  private async loadServers(config: any) {

    this.shortRefreshInterval = 1000 * (config['shortRefreshIntervalSeconds'] ?? 60)
    this.longRefreshInterval = 1000 * (config['longRefreshIntervalSeconds'] ?? 60)

    const serverPromises = []
    let i = 0
    for (const [id, server] of Object.entries<ConfigServerData>(config)) {
      if(!server.name) {
        console.warn(`Skipping ${id}: Server has no name`)
      } else if(!server.type) {
        console.warn(`Skipping ${id}: ${server.name} has no type`)
      } else if(!server.ip) {
        console.warn(`Skipping ${id}: ${server.name} has no ip`)
      } else {
        const [, host, port] = server.ip.match(/([a-zA-Z0-9.]+):?(\d*)/)
        serverPromises.push(new Promise((resolve, reject) => {
          DNS.lookup(host, {
            verbatim: false
          }, (err, address, family) => {
            if (err) {
              console.warn("Warn: Failed to lookup ip for" + host, err)
              return reject(err)
            }

            const tags = server.tags ?? []
            if(server.systemd) tags.push('systemd')
            if(server.rcon) tags.push('rcon')

            let rconPassword = server.rcon?.password?.text
            if(server.rcon && server.rcon.password.env) {
              rconPassword = process.env[server.rcon.password.env]
            }

            this.servers[id] = new Server({
              id,
              name: server.name,
              domain: host,
              port: Number(port) ?? 27015,
              ip: address,
              type: server.type,
              tags: tags,
              cfgDirectory: server.cfgDirectory,
              activityId: server.activityId,
              systemd: server.systemd,
              rcon: {
                password: rconPassword,
                exitCommand: server.rcon?.exitCommand || "exit",
                requestExitCommand: server.rcon?.requestExitCommand || "exit"
              },
              status: {
                online: false,
                data: null
              },
              sortOrder: server.sortOrder
            })
            resolve(true)
          })
        }))
      }
    }

    await Promise.allSettled(serverPromises)

    console.log(`Loaded ${Object.keys(this.servers).length} servers`)
  }
}