import { readFileSync } from 'fs'
import { mkdir, stat } from 'fs/promises'
import Json5 from 'json5'
import DNS from 'dns'
import Server, { ConfigServerData } from './Server.js'
import Share, { ShareDestination, ShareInfo } from '../Share.js';
import { join } from 'path';
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import SteamAPI from '../steam.js'

export default class ServerManager {
  private servers: Record<string, Server> = {}
  private refreshInterval: number
  private addonShares: Record<string, Share> = {}

  private dataDir: string;
  private steam: SteamAPI

  constructor(steam: SteamAPI, dataDir: string) {
    this.steam = steam
    this.dataDir = dataDir
    this.load()
      .then(() => {
        this.refresh()
        setInterval(() => this.refresh(), this.refreshInterval)
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

  public get(key: string) {
    return this.servers[key.toLowerCase()]
  }

  public async refresh() {
    await Promise.allSettled(Object.values(this.servers).map(server => server.refresh()))
  }

  public hasShare(shareId: string) {
    return this.addonShares[shareId.toLowerCase()] != undefined
  }

  public getShare(shareId: string) {
    return this.addonShares[shareId.toLowerCase()]
  }

  public get shares() { 
    return Object.keys(this.addonShares)
  }

  private async loadShares(config: any) {
    try {
      await mkdir(join(this.dataDir, "shares"))
    } catch(_) {}

    for(const key in config.addons) {
      const data = config.addons[key] as Partial<ShareInfo>
      data.id = key
      if(!data.sourceFolder) {
        console.warn(`[Warn] Skipping addon share \"${key}\": Missing property 'sourceFolder' in config`)
        continue
      }

      try {
        await stat(data.sourceFolder)
        const destinations = data.destinations as ShareDestination[] || []
        for(let dest of Object.values(destinations)) {
          try {
            await stat(dest.path)
            if(dest.serverIds) {
              const serverIds = []
              for(const id of dest.serverIds) {
                const _id = id.toLowerCase()
                if(this.servers[_id]) {
                  serverIds.push(_id)
                } else {
                  console.warn(`[Warn] Addon Share "${key}" destination "${dest.id}" includes non existent server id: "${_id}"; skipping`)
                }
              }
              dest.serverIds = serverIds
            }
          } catch(err) {
            console.warn(`[Warn] Addon Share "${key}" destination "${dest.id}" path is invalid: "${dest.path}"`, err)
          }
          
        }
        const db = await open({
          filename: join(this.dataDir, `shares/${key.toLowerCase()}_addons_cache.db`),
          driver: sqlite3.Database
        })
        this.addonShares[key.toLowerCase()] = new Share(db, this.steam, data)
        console.info(`Loaded addon share "${key}"`)
      } catch(err) {
        console.warn(`Addon Share Directory "${key}" returned error: ${err}`)
      }
    }

    if(!config.addons["default"]) {
      console.warn("Warn: No default addon share found (no key named \"default\")")
    }
  }

  private async load() {
    const content = readFileSync('./config/config.json', 'utf-8')
    const config = Json5.parse(content)

    this.refreshInterval = 1000 * (config['refreshIntervalSeconds'] ?? 60)

    const serverPromises = []
    let i = 0
    for (const server of config['servers'] as ConfigServerData[]) {
      if(!server.name) {
        console.warn(`Server ${server.id ?? server} has no name`)
      } else if(!server.type) {
        console.warn(`Server ${server.name} has no type`)
      } else if(!server.ip) {
        console.warn(`Server ${server.name} has no ip`)
      } else {
        const id = server.id?.toLowerCase() ?? server.name.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, '')
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

    console.log('Loaded servers, now loading shares')
    await this.loadShares(config)
  }
}