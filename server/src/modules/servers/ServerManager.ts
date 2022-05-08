import {
  readFileSync
} from 'fs'
import Json5 from 'json5'
import DNS from 'dns'
import Server, { ConfigServerData } from './Server.js'

export default class ServerManager {
  private servers: Record<string, Server> = {}
  private refreshInterval: number

  constructor() {
    this.load()
      .then(() => {
        this.refresh()
        setInterval(() => this.refresh(), this.refreshInterval)
      })
  }

  public getAll() {
    return Object.values(this.servers).sort((a,b) => a.port - b.port)
  }

  public get(key: string) {
    return this.servers[key.toLowerCase()]
  }

  private async refresh() {
    await Promise.allSettled(Object.values(this.servers).map(server => server.refresh()))
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
              systemd: server.systemd,
              rcon: {
                password: rconPassword,
                exitCommand: server.rcon?.exitCommand || "exit",
                requestExitCommand: server.rcon?.requestExitCommand || "exit"
              },
              status: {
                online: false,
                data: null
              }
            })
            resolve(true)
          })
        }))
      }
    }

    await Promise.allSettled(serverPromises)
  }
}