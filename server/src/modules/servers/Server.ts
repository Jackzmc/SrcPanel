import Gamedig from 'gamedig';
import { Rcon } from 'rcon-client';
import { readdir } from 'fs/promises'
import { join, resolve } from 'path'
import { statSync } from 'fs';
import { PluginServerStatus } from '../../../../common-types/Server';

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
const MIN_REFRESH_TIME = 5000


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

const sleep = time => new Promise(res => setTimeout(res, time));
const MAX_PLAYER_STATS = 300

interface PlayerStats {
  timestamp: number,
  count: number
}

export default class Server { 
    private _info: ServerInfo
    private _status: ServerStatus
    private _status2: PluginServerStatus
    private _cfgDir: string;
    private _actid: string
    private _sortOrder: number
    private lastRefresh: number
    private _cvars: Record<string, string>
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
    
    public playerCounts: PlayerStats[] = [] 

    constructor(server: ServerData) {
        this._info = {
          id: server.id,
          name: server.name,
          domain: server.domain,
          ip: server.ip,
          port: server.port,
          type: server.type,
        }
        this._actid = server.activityId
        this._sortOrder = server.sortOrder
        if(server.cfgDirectory) {
          this._cfgDir = resolve(server.cfgDirectory)
          try {
            statSync(this._cfgDir)
          } catch(err) {
            console.error(`Error: Could not access config directory for server \"${server.id}\":`, err)
          }
        }
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
    public get status2(): PluginServerStatus { 
      return {
        "playerCount": 5,
        "map": "c8m2_subway",
        "gamemode": "coop",
        "players": [
          {
            "flowProgress": 0,
            "states": 2,
            "steamid": "76561198003132253",
            "name": "Tough Guy",
            "team": 2,
            "isAlive": true,
            "permHealth": 47,
            "flow": 18741.15625,
            "isPinned": false,
            "tempHealth": 0,
            "survivor": 2,
            "weapons": [
              "weapon_shotgun_spas",
              "weapon_melee",
              "weapon_molotov",
              "weapon_first_aid_kit",
              null,
              null
            ]
          },
          {
            "flowProgress": 0,
            "states": 4,
            "steamid": "76561199367350969",
            "name": "Mrs. Kelly",
            "team": 2,
            "isAlive": false,
            "permHealth": 1,
            "flow": 18741.15625,
            "isPinned": false,
            "tempHealth": 7,
            "survivor": 3,
            "weapons": [
              "weapon_shotgun_spas",
              "weapon_chainsaw",
              null,
              "weapon_first_aid_kit",
              null,
              null
            ]
          },
          {
            "flowProgress": 25,
            "states": 5,
            "steamid": "76561198058753262",
            "name": "Jackzie ❤",
            "team": 2,
            "isAlive": true,
            "permHealth": 1,
            "flow": 18841.93359375,
            "isPinned": false,
            "tempHealth": 13,
            "survivor": 1,
            "weapons": [
              "weapon_sniper_military",
              "weapon_melee",
              "weapon_molotov",
              null,
              "weapon_pain_pills",
              null
            ]
          },
          {
            "flowProgress": 62,
            "states": 1,
            "steamid": "76561198046593262",
            "name": "Silynx",
            "team": 2,
            "isAlive": true,
            "permHealth": 1,
            "flow": 18692.767578125,
            "isPinned": false,
            "tempHealth": 20,
            "survivor": 0,
            "weapons": [
              "weapon_shotgun_spas",
              "weapon_melee",
              "weapon_molotov",
              "weapon_first_aid_kit",
              null,
              null
            ]
          },
          {
            "flowProgress": 25,
            "states": 3,
            "steamid": "76561198368726720",
            "name": "The Liquor",
            "team": 2,
            "isAlive": true,
            "permHealth": 47,
            "flow": 18741.15625,
            "isPinned": false,
            "tempHealth": 0,
            "survivor": 1,
            "weapons": [
              "weapon_shotgun_spas",
              "weapon_melee",
              null,
              "weapon_first_aid_kit",
              "weapon_pain_pills",
              null
            ]
          },
          {
            "states": 2,
            "steamid": "BOT",
            "name": "Smoker",
            "team": 3,
            "isAlive": true,
            "permHealth": 250,
            "class": 2
          },
          {
            "states": 2,
            "steamid": "BOT",
            "name": "Spitter",
            "team": 3,
            "isAlive": true,
            "permHealth": 100,
            "class": 3
          }
        ],
        "refreshInterval": 10,
        "lastUpdateTime": 1689637994
      }
      return this._status2
    }

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

    public get activityLogId() {  return this._actid }
    public get cvars() { return this._cvars }

    public setStatus(status: PluginServerStatus) {
      status.players = status.players.sort((a, b) => a.team - b.team)
      this._status2 = status
    }

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
      if(!this.rcon.connected || !this.rcon.client.authenticated) {
        await this.rcon.client.connect()
      }
    }
    
    public async start() {
      if(!this.hasSystemd) throw new Error("Systemd config is missing")
    }

    public async stop(force: boolean) {
      if(!this.hasRcon) throw new Error("No rcon config is setup")
      return await this.sendCommand(force ? this.rcon.exitCommand : this.rcon.requestExitCommand)
    }

    public async stopWait(force: boolean, timeoutSeconds = 10_000) {
      if(!this.hasRcon) throw new Error("No rcon config is setup")
      await this.sendCommand(force ? this.rcon.exitCommand : this.rcon.requestExitCommand)
      while(this.rcon.connected && timeoutSeconds > 0) {
        timeoutSeconds -= 1000
        await sleep(1000)
      }
      return timeoutSeconds > 0
    }

    public async sendCommand(cmd: string) {
      await this.rconConnect()
      return await this.rcon.client.send(cmd)
    }

    public async getStats() {
      const statusResponse = await this.sendCommand("stats")
      const lines = statusResponse.split("\n")
      if(lines.length == 3) { // 3rd line is empty
        const data = lines[1].trim().split(/[\s,]+/g)
        return { 
          cpu: Number(data[0]), 
          bandwidth: { in: Number(data[1]), out: Number(data[2]) }, 
          uptime: Number(data[3]), 
          users: Number(data[4]), 
          fps: Number(data[5])
        }
      } else {
        return null
      }
    }

    public async refresh(force = false, includeRules = false) {
        const now = Date.now()
        if(!force && now - this.lastRefresh < MIN_REFRESH_TIME) return
        this.lastRefresh = now
        try {
            const state = await Gamedig.query({
              type: this._info.type as Gamedig.Type,
              host: this._info.ip,
              port: this._info.port,
              givenPortOnly: true,
              maxAttempts: 1,
              socketTimeout: 3000,
              attemptTimeout: 5000,
              requestRules: includeRules
            })
            if(includeRules && (state.raw as any).rules) {
              this._cvars = (state.raw as any).rules
            }
            this._status.data = {
              players: state.players
                .filter(p => p.name.length > 0) // Some names are just "", assumingly bots?
                .map(p => p.name),
              maxplayers: state.maxplayers,
              map: state.map,
              gamemode: (state.raw as any).tags[0]
            }
            this.playerCounts.push({
              timestamp: Math.floor(Date.now() / 1000),
              count: state.players.length
            })
            if(this.playerCounts.length > MAX_PLAYER_STATS) this.playerCounts.shift()
            this._status.online = true
            return {
              cvars: this._cvars
            }
        } catch(err) {
          this._status.data = null
          this._status.online = false
        }
    } 
}