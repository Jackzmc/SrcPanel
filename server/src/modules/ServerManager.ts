import {
  readFileSync
} from 'fs'
import CommentJson from 'comment-json'
import Gamedig from 'gamedig'
import DNS from 'dns'

interface Server {
  id ? : string;
  name: string;
  domain ? : string;
  ip: string,
  port: number,
  type: string,
  rcon ? : {
    password: {
      text ? : string;
      env ? : string;
    };
    exitCommand ? : string;
    requestExitCommand ? : string;
  }
  systemd ? : {
    isUser: boolean;
    serviceName: string;
  },
  tags: string[],
  status: ServerStatus
}

interface ServerStatus {
  data?: {
    players: string[],
    maxplayers: number,
    map: string,
    gamemode: string,
  },
  online: boolean
}

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
    return Object.values(this.servers)
  }

  private async refresh() {
    for(let server of Object.values(this.servers)) {
      try {
        const state = await Gamedig.query({
          type: server.type as Gamedig.Type,
          host: server.ip,
          port: server.port,
          givenPortOnly: true,
          maxAttempts: 1,
          socketTimeout: 3000,
          attemptTimeout: 5000
        })
        server.status.data = {
          players: state.players.map(p => p.name),
          maxplayers: state.maxplayers,
          map: state.map,
          gamemode: (state.raw as any).tags[0]
        }
        server.status.online = true
      } catch(err) {
        server.status.data = null
        server.status.online = false
      }
    }
  }

  private async load() {
    const content = readFileSync('./config/config.json', 'utf-8')
    const config = CommentJson.parse(content, null, true)

    this.refreshInterval = 1000 * (config['refreshIntervalSeconds'] ?? 60)

    const serverPromises = []
    for (const server of config['servers']) {
      if(!server.name) {
        console.warn(`Server ${server.id ?? server} has no name`)
      } else if(!server.type) {
        console.warn(`Server ${server.name} has no type`)
      } else if(!server.ip) {
        console.warn(`Server ${server.name} has no ip`)
      } else {
        const id = server.id ?? server.name.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, '')
        const [, host, port] = server.ip.match(/([a-zA-Z0-9.]+):?(\d*)/)
        serverPromises.push(new Promise((resolve, reject) => {

          DNS.lookup(host, {
            verbatim: false
          }, (err, address, family) => {
            if (err) {
              console.warn("Warn: Failed to lookup ip for" + host, err)
              return reject(err)
            }

            this.servers[id] = {
              id,
              name: server.name,
              domain: host,
              port: Number(port) ?? 27015,
              ip: address,
              type: server.type,
              tags: server.tags ?? [],
              status: {
                online: false,
                data: null
              }
            }
            resolve(true)
          })
        }))
      }
    }
    await Promise.allSettled(serverPromises)
    console.log(this.servers)
  }
}