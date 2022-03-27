import Gamedig from 'gamedig';
import { Rcon } from 'rcon-client';

export interface BaseServerData {
    id ? : string;
    name: string;
    domain ? : string;
    ip: string,
    port: number,
    type: string,
    systemd ? : {
      isUser: boolean;
      serviceName: string;
    },
    tags: string[],
    status: ServerStatus
}

export interface ConfigServerData extends BaseServerData {
    rcon ? : {
        password: {
          text ? : string;
          env ? : string;
        };
        exitCommand ? : string;
        requestExitCommand ? : string;
    },
    systemd ? : {
    isUser: boolean;
    serviceName: string;
    },
}

export interface ServerData extends BaseServerData {
    rcon: {
      password: string,
      exitCommand: string,
      requestExitCommand: string
    }
}
  
  export interface ServerStatus {
    data?: {
      players: string[],
      maxplayers: number,
      map: string,
      gamemode: string,
    },
    online: boolean
  }

export default class Server { 
    private _status: ServerStatus
    private _id ? : string;
    private _name: string;
    private _domain ? : string;
    private _ip: string;
    private _port: number;
    private _type: string ;
    private rcon?: {
      password: string,
      exitCommand: string
      requestExitCommand: string,
      client: Rcon,
      connected: boolean
    } = null; 
    private systemd?: {
      isUser: boolean;
      serviceName: string;
    } = null;
    public tags: Readonly<string[]>;

    constructor(server: ServerData) {
        this._id = server.id
        this._name = server.name
        this._domain = server.domain
        this._ip = server.ip
        this._port = server.port
        this._type = server.type
        if(server.rcon) {
          const client = new Rcon({
            host: this._ip, port: this._port, password: server.rcon.password
          })
          client.on('connect', () => {
            this.rcon.connected = true
          })
          client.on('end', () => this.rcon.connected = false)
          client.on('error', (err) => {
            console.log(`[Server::${this._id}]`, err)
            this.rcon.connected = false
          })
          this.rcon = {
            ...server.rcon,
            client,
            connected: false
          }
        }
        this.systemd = server.systemd
        this.tags = server.tags
        this._status = { data: null, online: false }
    }

    public get id() { return this._id }
    public get name() { return this._name }
    public get domain() { return this._domain }
    public get ip() { return this._ip }
    public get port() { return this._port }
    public get type() { return this._type }

    public get status(): ServerStatus { return this._status }

    public get hasRcon() { return this.rcon !== null }
    public get hasSystemd() { return this.systemd !== null }


    private async rconConnect() {
      if(!this.rcon.connected) {
        await this.rcon.client.connect()
      }
    }

    public async start() {
      if(!this.hasSystemd) throw new Error("Systemd config is missing")
    }

    public async stop(force: boolean) {
      if(!this.hasRcon) throw new Error("No rcon config is setup")
      await this.rconConnect()
      return await this.sendCommand(force ? this.rcon.exitCommand : this.rcon.requestExitCommand)
    }

    public async sendCommand(cmd: string) {
      if(this.rcon.client.authenticated) {
        return await this.rcon.client.send(cmd)
      } else {
        throw new Error("Rcon not connected")
      }
    }



    public async refresh() {
        try {
            const state = await Gamedig.query({
              type: this.type as Gamedig.Type,
              host: this.ip,
              port: this.port,
              givenPortOnly: true,
              maxAttempts: 1,
              socketTimeout: 3000,
              attemptTimeout: 5000
            })
            this._status.data = {
              players: state.players.map(p => p.name),
              maxplayers: state.maxplayers,
              map: state.map,
              gamemode: (state.raw as any).tags[0]
            }
            this._status.online = true
        } catch(err) {
            this._status.data = null
            this._status.online = false
        }
    } 
}