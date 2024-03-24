import Gamedig from 'gamedig';
import { Rcon } from 'rcon-client';
import { open, readdir } from 'fs/promises'
import { join, resolve } from 'path'
import { statSync } from 'fs';
import { PlayerAction, PlayerStats, ServerInfo } from '../../../../common-types/Server';
import { LiveRecord, LiveDataCache, updateLiveCache } from '../../../../common-types/Live.js';
import { EventEmitter } from 'node:events';
import { GenericError } from '../../util.js';
import { Tail } from 'tail'

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
// The number of milliseconds until live data expires

export interface BaseServerData {
  id ? : string;
  name: string;
  domain ? : string;
  ip: string,
  port: number,
  type: string,
  cfgDirectory?: string,
  logsPath?: string,
  activityId?: string,
  sortOrder?: number,
  systemd ? : {
    isUser: boolean;
    serviceName: string;
  },
  tags: string[],
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

const sleep = time => new Promise(res => setTimeout(res, time));
const MAX_PLAYER_STATS = 300
const MAX_LOGS_LINES = 30
const LIVE_CACHE_TTL = 1000 * 60 * 60 * 1 // Live cache data expires after a minute


type Features = "rcon" | "console" | "configs" | "systemd"

export default class Server extends EventEmitter { 
    private _info: ServerInfo
    private _status: ServerStatus
    #liveCache?: LiveDataCache
    private _cfgDir: string
    private _logPath: string
    private _actid: string
    private _sortOrder: number
    private lastRefresh: number
    private _cvars: Record<string, string>
    private _startTime: number
    private _logsCache: string[] = []
    private _group: string
    #features: Features[] = []
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

    constructor(group: string, server: ServerData) {
        super()
        this._group = group
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
            this.#features.push("configs")
          } catch(err) {
            console.error(`[Server/${server.id}] ERROR: Could not access config directory:`, err)
          }
        }
        if(server.logsPath) {
          try {
            this._logPath = resolve(server.logsPath)
            statSync(this._logPath)
            this.#features.push("console")
            this.#createLogsReader()
          } catch(err) {
            if(err.code === "ENOENT")
              console.error(`[Server/${server.id}] ERROR: Log file does not exist at ${server.logsPath}; skipping`)
            else throw err
          }
        }
        if(server.rcon) {
          const client = new Rcon({
            host: this._info.ip, port: this._info.port, password: server.rcon.password
          })
          this.#features.push("rcon")
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
        if(this.systemd) this.#features.push("systemd")
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
    /**
     * The order to sort the server, ascending (lower: higher)
     */
    public get sortOrder() { return this._sortOrder }

    public get info() { 
      return {
        ...this._info,
        features: this.features,
        tags: this.tags
      } 
    }

    /**
      Returns the group (if any) server belongs to
    */
    public get group() {
      return this._group
    }

    /**
     * Start time of server in unix milliseconds
     */
    public get startTime() {
      return this._startTime
    }

    /**
     * Uptime of server in unix milliseconds
     */
    public get uptime() {
      if(!this._startTime) return 0
      return Date.now() - this._startTime
    }

    /**
     * Latest cached server status, if any
     */
    public get status(): ServerStatus { return this._status }

    /**
     * Returns any fresh live view data. Will purge any stale data
     */
    public get liveStatus(): LiveDataCache { 
      if(this.#liveCache) {
        if(Date.now() - this.#liveCache.lastUpdate > LIVE_CACHE_TTL) {
          console.debug("Live cache expired, purging")
          this.#liveCache = null
        }
      }
      return this.#liveCache
    }

    public get liveViewers() {
      return this.listenerCount("live")
    }

    public get hasRcon() { return this.rcon !== null }
    public get hasSystemd() { return this.systemd !== null }
    public get hasConfigs() { return this._cfgDir !== null && this._cfgDir !== undefined}
    public get hasConsole() { return this.#features.includes("console") }

    public get features() {
      return [...this.#features]
    }

    /**
     * The id to find activity logs for
     */
    public get activityLogId() {  return this._actid }
    /**
     * List of any cached cvars from calling .refresh(true)
     */
    public get cvars() { return this._cvars }

    /**
     * Returns the cached list of server console logs
     */
    public get logs() { return this._logsCache }

    /**
     * Add log entry to console
     * @param line
     */
    #pushLogEntry(line: string) {
      this._logsCache.push(line)
      if(this._logsCache.length > MAX_LOGS_LINES) {
        this._logsCache.splice(0, 1)
      }
      this.emit("log", line)
    }

    /**
     * Returns a tail stream (live-view) of server's console logs
     * @returns 
     */
    async #createLogsReader() { 
      // Read previous lines
      const file = await open(this._logPath)
      if(!file) return console.warn(`[Server/${this.id}] ERROR: Cannot open file ${this._logPath}`)
      for await (const line of file.readLines()) {
        this.#pushLogEntry(line)
      }
      await file.close()

      // Subscribe to new:
      const tail = new Tail(this._logPath)
      tail.on('line', (line) => this.#pushLogEntry(line))
      tail.on("error", (err) => {
        console.warn(`[Server/${this.id}] WARN: Log file stream errored.\n`, err)
      })
      return tail
    }

    /**
     * Pushes a live record to all subscribers
     * @param type The type of ther ecord
     * @param record The record itself
     * @returns 
     */
    public pushLiveRecord(record?: LiveRecord) {
      // If record is null, it means shutdown is happening
      this.emit("live", record)
      if(record)
        this.#liveCache = updateLiveCache(this.#liveCache, record)
    }

    /**
     * Returns a list of config files' paths recursively
     * @param showHidden Should hidden files be included (see HIDDEN_CONFIG_FILES)
     * @returns string[]
     */
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

    /**
     * Attempt to connect to rcon, if not already connected
     */
    private async rconConnect() {
      if(!this.rcon.connected || !this.rcon.client.authenticated) {
        // Drop connection if already connected
        if(this.rcon.client.socket && !this.rcon.client.authenticated) {
          console.error(`[Server/${this.id}] Connected but not authenticated. Possibly unauthorized?`)
        }
        await this.rcon.client.connect()
      }
    }
    
    /**
     * Attempt to start server by systemd (Not implemented)
     */
    public async start() {
      if(!this.hasSystemd) throw new Error("Systemd config is missing")
      throw new Error("Not implemented")
    }

    /**
     * Sends stop command or force-stop command (according to configured commands)
     * @param force forcefully?
     * @returns boolean on success or false if not successful (players online and not forced)
     */
    public async stop(force: boolean) {
      if(!this.hasRcon) throw new Error("No rcon config is setup")
      const msg = await this.sendCommand(force ? this.rcon.exitCommand : this.rcon.requestExitCommand);
      // If players online, requestExitCommand will not shut down server, so return false
      return force || msg != "Players are online."
    }

    /**
     * Stops a server, but polls until server stopped, finally returning after timeout or stopped
     * @param force forcefully?
     * @param timeoutSeconds Amount of seconds to wait for server to hahve stopped
     * @returns bool - success or false on timed out
     */
    public async stopWait(force: boolean, timeoutSeconds = 10_000) {
      if(!this.hasRcon) throw new Error("No rcon config is setup")
      await this.sendCommand(force ? this.rcon.exitCommand : this.rcon.requestExitCommand)
      while(this.rcon.connected && timeoutSeconds > 0) {
        timeoutSeconds -= 1000
        await sleep(1000)
      }
      return timeoutSeconds > 0
    }

    /**
     * Send an rcon command, automatically trying to connect to rcon
     * @param cmd the command
     * @returns the server's response
     */
    public async sendCommand(cmd: string) {
      await this.rconConnect()
      return await this.rcon.client.send(cmd)
    }

    /**
     * Attempts to perform an action (ie, kicking)
     * @param action The action to perform
     * @param steamid The player to perform it on
     * @param args 
     */
    public async performAction(action: PlayerAction, steamid: string, args: Record<string, string> = {}) {
      let sourcemodId: string;
      if(steamid.startsWith("#")) {
        if(isNaN(Number(steamid.slice(1)))) { 
          throw new Error("invalid userid: " + steamid)
        }
        sourcemodId = steamid
      } else {
        sourcemodId = `#${steamid.replace(/:/g, '_')}`
      }
      const command = this.#getActionCommand(action, sourcemodId, args)
      await this.sendCommand(command)
    }

    /**
     * Returns the command formatted for the action
     * @param action 
     * @param sourcemodId The valid sourcemod client id
     * @param args 
     * @returns 
     */
    #getActionCommand(action: PlayerAction, sourcemodId: string, args: Record<string, string>): string {
      switch(action) {
        case "kick": {
          if(args.reason)
            return `sm_kick ${sourcemodId} "${args.reason.replace(/"/, "'")}`
          else
            return `sm_kick ${sourcemodId}`
        }
        default: throw new GenericError(`Unsupported action \"${action}\"`, "UNSUPPORTED_PLAYER_ACTION")
      }
    }

    /**
     * Fetches server information (via gamedig), possibly using cache
     * @param force true to bypass cache
     * @param includeRules include cvars
     * @returns 
     */
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
            const raw = state.raw as any
            if(includeRules && raw.rules) {
              this._cvars = raw.rules
            }
            this._status.data = {
              players: state.players
                .filter(p => p.name.length > 0) // Some names are just "", assumingly bots?
                .map(p => p.name),
              maxplayers: state.maxplayers,
              map: state.map,
              gamemode: raw.tags ? raw.tags[0] : undefined
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