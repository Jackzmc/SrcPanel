import Gamedig from 'gamedig';
import { Rcon } from 'rcon-client';
import { readdir } from 'fs/promises'
import { join, resolve } from 'path'
import { statSync } from 'fs';

const HIDDEN_CONFIG_FILES = [
  "360controller.cfg",
  "addonconfig.cfg",
  "config_default.cfg",
  "lowend.cfg",
  "listenserver.cfg",
  "listenserver360.cfg",
  "modsettings.cfg",
  "perf.cfg",
  "screenshots.cfg",
  "screenshots_undo.cfg",
  "skill1.cfg",
  "splitscreen_off.cfg",
  "splitscreen_on.cfg",
  "test_end.cfg",
  "test_start.cfg",
  "undo360controller.cfg",
  "joy_preset_1.cfg",
  "joy_preset_2.cfg",
  "joy_preset_3.cfg",
  "joy_preset_4.cfg",
]

const VALID_CONFIG_EXTS = ["cfg", "toml"]

export interface BaseServerData {
  id ? : string;
  name: string;
  domain ? : string;
  ip: string,
  port: number,
  type: string,
  cfgDirectory?: string,
  activityId?: string,
  sortOrder?: number,
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

export interface ServerInfo {
  id?: string,
  name: string,
  domain?: string,
  port: number,
  type: string,
  ip: string,
}

export default class Server { 
    private _info: ServerInfo
    private _status: ServerStatus
    private _cfgDir: string;
    private _actid: string
    private _sortOrder: number
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
        this._info = {
          id: server.id,
          name: server.name,
          domain: server.domain,
          ip: server.ip,
          port: server.port,
          type: server.type,
        }
        this._sortOrder = server.sortOrder
        if(server.cfgDirectory) {
          this._cfgDir = resolve(server.cfgDirectory)
          try {
            statSync(this._cfgDir)
          } catch(err) {
            console.error(`Error: Could not access config directory for server \"${server.id}\":`, err)
          }
        }
        this._actid = server.activityId
        if(server.rcon) {
          const client = new Rcon({
            host: this._info.ip, port: this._info.port, password: server.rcon.password
          })
          client.on('connect', () => {
            this.rcon.connected = true
          })
          client.on('end', () => this.rcon.connected = false)
          client.on('error', (err) => {
            console.warn(`[Warn] [Server::${this._info.id}]`, err.code ?? err.message)
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

    public get id() { return this._info.id }
    public get name() { return this._info.name }
    public get domain() { return this._info.domain }
    public get ip() { return this._info.ip }
    public get port() { return this._info.port }
    public get type() { return this._info.type }
    public get configDir() { return this._cfgDir }
    public get sortOrder() { return this._sortOrder }

    public get info() { 
      return {
        ...this._info,
        features: this.features,
        tags: this.tags
      } 
    }

    public get status(): ServerStatus { return this._status }

    public get hasRcon() { return this.rcon !== null }
    public get hasSystemd() { return this.systemd !== null }
    public get hasConfigs() { return this._cfgDir !== null && this._cfgDir !== undefined}

    public get features() {
      const arr = []
      if(this.rcon) arr.push("rcon")
      if(this.systemd) arr.push("systemd")
      if(this._cfgDir) arr.push("configs")
      return arr
    }

    public get activityLogId() { return this._actid }

    // Fetches all config, including one level nested
    public async getConfigFiles(showHidden = false) {
      if(!this._cfgDir) return
      return await this._recurseConfig(this._cfgDir, showHidden)
    }

    private async _recurseConfig(path: string, showHidden: boolean, parent = "") {
      const dirents = await readdir(path, { withFileTypes: true })
      const files = []
      for(const dirent of dirents) {
        const filepath = `${parent}${dirent.name}`
        if(dirent.isDirectory()) {
          files.push(...await this._recurseConfig(join(path, dirent.name), showHidden, `${filepath}/`))
        } else if(dirent.isFile()) {
          if(!showHidden) {
            let skip = false
            for(const hidden of HIDDEN_CONFIG_FILES) {
              if(dirent.name == hidden) {
                skip = true
                break
              }
            }
            if(skip) continue
          }
          const ext = dirent.name.split(".").pop()
          if(VALID_CONFIG_EXTS.includes(ext)) {
            files.push(filepath)
          }
        }
      }
      return files
    }

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
              type: this._info.type as Gamedig.Type,
              host: this._info.ip,
              port: this._info.port,
              givenPortOnly: true,
              maxAttempts: 1,
              socketTimeout: 3000,
              attemptTimeout: 5000
            })
            this._status.data = {
              players: state.players
                .filter(p => p.name.length > 0) // Some names are just "", assumingly bots?
                .map(p => p.name),
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