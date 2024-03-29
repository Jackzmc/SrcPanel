import Gamedig from 'gamedig';
import { open, readdir } from 'fs/promises'
import { join, resolve } from 'path'
import { statSync } from 'fs';
import { GroupInfo, PlayerStats, SERVER_TYPE_MAP, ServerAction, ServerData, ServerInfo, ServerStatus, ServerType } from '../../../../common-types/Server.js';
import { LiveRecord, LiveDataCache, updateLiveCache, LiveRecordType, LiveRecordResponse, CommandResultType } from '../../../../common-types/Live.js';
import { EventEmitter } from 'node:events';
import { Tail } from 'tail'
import PluginSocket from './PluginSocket.js';

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
  actions?: ServerAction[]
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

export interface ServerExtendedData extends BaseServerData {
  rcon: {
    password: string,
    exitCommand: string,
    requestExitCommand: string
  },
  actions?: ServerAction[]
}
  

const sleep = time => new Promise(res => setTimeout(res, time));
const MAX_PLAYER_STATS = 300
const MAX_LOGS_LINES = 30
const LIVE_CACHE_TTL = 1000 * 60 * 3 // Live cache data expires after 3 minutes


type Features = "rcon" | "console" | "configs" | "systemd" | "plugin"

export default class Server extends EventEmitter { 
    #info: ServerData
    #status: ServerStatus
    #liveCache?: LiveDataCache
    #cfgDir: string
    #logPath: string
    #actid: string
    #sortOrder: number
    #lastRefresh: number
    #cvars: Record<string, string>
    #startTime: number
    #logsCache: string[] = []
    #actions: ServerAction[]
    #group: GroupInfo
    #features: Features[] = []
    #systemd?: {
      isUser: boolean;
      serviceName: string;
    } = null;
    #tags: string[];

    #socket: PluginSocket
      
    public playerCounts: PlayerStats[] = [] 

    constructor(group: GroupInfo, server: ServerExtendedData) {
        super()
        this.#group = group
        this.#info = {
          id: server.id,
          name: server.name,
          domain: server.domain,
          ip: server.ip,
          port: server.port,
          type: group.type || /* legacy */ server.type,
        }
        this.#actid = server.activityId
        this.#sortOrder = server.sortOrder
        this.#actions = [ ... group.actions, ... server.actions ]
        if(server.cfgDirectory) {
          this.#cfgDir = resolve(server.cfgDirectory)
          try {
            statSync(this.#cfgDir)
            this.#features.push("configs")
          } catch(err) {
            console.error(`[Server/${server.id}] ERROR: Could not access config directory:`, err)
          }
        }

        if(server.logsPath) {
          try {
            this.#logPath = resolve(server.logsPath)
            statSync(this.#logPath)
            this.#features.push("console")
            this.#createLogsReader()
          } catch(err) {
            if(err.code === "ENOENT")
              console.error(`[Server/${server.id}] ERROR: Log file does not exist at ${server.logsPath}; skipping`)
            else throw err
          }
        }

        this.#systemd = server.systemd
        if(this.#systemd) this.#features.push("systemd")
        this.#tags = server.tags
        this.#status = { data: null, online: false }

      this.on("live:subscribe", async() => {
        try {
          if(this.#socket?.Authenticated) {
            await this.#socket.send(LiveRecordResponse.OK, this.liveViewers)
          }
        } catch(err) {
          // Swallow errors, doesn't mater
        }
      })
    }

    public get SocketConnected() {
      return this.#socket.Authenticated
    }

    public get id() { return this.#info.id }
    public get name() { return this.#info.name }
    public get domain() { return this.#info.domain }
    public get ip() { return this.#info.ip }
    public get port() { return this.#info.port }
    public get type(): ServerType { 
      return SERVER_TYPE_MAP[this.#info.type] ?? this.#info.type 
    }
    public get configDir() { return this.#cfgDir }
    public get actions() { return this.#actions }
    public get tags(): string[] {  return this.#tags }
    /**
     * The order to sort the server, ascending (lower: higher)
     */
    public get sortOrder() { return this.#sortOrder }

    public get info() : ServerInfo { 
      return {
        ...this.#info,
        type: this.type,
        actions: this.actions,
        features: this.features,
        status: this.status,
        sortOrder: this.sortOrder,
        tags: this.tags
      } 
    }

    /**
      Returns the group (if any) server belongs to
    */
    public get group() {
      return this.#group
    }

    /**
     * Start time of server in unix milliseconds
     */
    public get startTime() {
      return this.#startTime
    }

    /**
     * Uptime of server in unix milliseconds
     */
    public get uptime() {
      if(!this.#startTime) return null
      return (Date.now()/1000) - this.#startTime
    }

    /**
     * Latest cached server status, if any
     */
    public get status(): ServerStatus { return this.#status }

    /**
     * Returns any fresh live view data. Will purge any stale data
     */
    public get liveStatus(): LiveDataCache { 
      if(this.#liveCache) {
        console.debug(Date.now() - this.#liveCache.lastUpdate, this.#liveCache.lastUpdate)
        if(Date.now() - this.#liveCache.lastUpdate > LIVE_CACHE_TTL) {
          this.#liveCache = null
        }
      }
      return this.#liveCache
    }

    public get liveViewers() {
      return this.listenerCount("live")
    }

    public get hasSystemd() { return this.#systemd !== null }
    public get hasConfigs() { return this.#cfgDir !== null && this.#cfgDir !== undefined}
    public get hasConsole() { return this.#features.includes("console") }
    public get hasPlugin() { return this.#features.includes("plugin") }

    public get features() {
      return [...this.#features]
    }

    /**
     * The id to find activity logs for
     */
    public get activityLogId() {  return this.#actid }
    /**
     * List of any cached cvars from calling .refresh(true)
     */
    public get cvars() { return this.#cvars }

    /**
     * Returns the cached list of server console logs
     */
    public get logs() { return this.#logsCache }

    /**
     * Add log entry to console
     * @param line
     */
    #pushLogEntry(line: string) {
      this.#logsCache.push(line)
      if(this.#logsCache.length > MAX_LOGS_LINES) {
        this.#logsCache.splice(0, 1)
      }
      this.emit("log", line)
    }

    /**
     * Returns a tail stream (live-view) of server's console logs
     * @returns 
     */
    async #createLogsReader() { 
      // Read previous lines
      const file = await open(this.#logPath)
      if(!file) return console.warn(`[Server/${this.id}] ERROR: Cannot open file ${this.#logPath}`)
      for await (const line of file.readLines()) {
        this.#pushLogEntry(line)
      }
      await file.close()

      // Subscribe to new:
      const tail = new Tail(this.#logPath)
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
      if(record) {
        this.#liveCache = updateLiveCache(this.#liveCache, record)
        if(record.type === LiveRecordType.Game) {
          this.#startTime = record.startTime
        }
        this.#status = {
          data: this.#status.data ??  { players: [], maxplayers: 0, map: "", gamemode: "" },
          online: true
        } 
        if(this.#liveCache.game) {
          this.#status.data.gamemode = this.#liveCache.game.gamemode
          this.#status.data.map = this.#liveCache.game.map
        }
        if(this.#liveCache.players)
          this.#status.data.players = Object.values(this.#liveCache.players).map(pl => pl.name)
          this.#status.data.maxplayers = Object.keys(this.#liveCache.players).length
      }
    }

    /**
     * Returns a list of config files' paths recursively
     * @param showHidden Should hidden files be included (see HIDDEN_CONFIG_FILES)
     * @returns string[]
     */
    public async getConfigFiles(showHidden = false) {
      if(!this.#cfgDir) return
      return await this.#recurseConfig(this.#cfgDir, showHidden)
    }

    async #recurseConfig(path: string, showHidden: boolean, parent = "") {
      const dirents = await readdir(path, { withFileTypes: true })
      const files = []
      for(const dirent of dirents) {
        const filepath = `${parent}${dirent.name}`
        if(dirent.isDirectory()) {
          files.push(...await this.#recurseConfig(join(path, dirent.name), showHidden, `${filepath}/`))
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

    _setSocket(socket: PluginSocket | null) {
      this.#socket = socket

      if(socket) {
        this.#features.push("plugin")
      } else {
        let index = this.#features.indexOf("plugin")
        if(index > -1) this.#features.splice(index, 1)
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
    public async stop(force: boolean): Promise<boolean> {
      if(force) {
        const result = await this.performAction("stop", "builtin")
        return Boolean(result.result)
      } else {
        const result = await this.performAction("request_stop", "builtin")
        return Boolean(result.result)
      }
    }

    /**
     * Stops a server, but polls until server stopped, finally returning after timeout or stopped
     * @param force forcefully?
     * @param timeoutSeconds Amount of seconds to wait for server to hahve stopped
     * @returns bool - success or false on timed out
     */
    public async stopWait(force: boolean, timeoutSeconds = 10_000) {
      if(!await this.stop(force)) return false
      // The stop happens a frame after, wait a second
      await sleep(1000) 
      // Wait until socket re-established
      while(!this.#socket?.Authenticated && timeoutSeconds > 0) {
        timeoutSeconds -= 1000
        await sleep(1000)
      }
      return timeoutSeconds > 0
    }

    public async performAction(command: string, namespace = "default", args: string[] = []) {
      if(!this.#socket) throw new Error("Not connected to plugin socket")
      const response = await this.#socket.send(LiveRecordResponse.RunCommand, command, namespace)
      switch(response.resultType) {
        case CommandResultType.Boolean: 
          response.result = Boolean(response.result)
          break
      }
      return response
    }

    /**
     * Fetches server information (via gamedig), possibly using cache
     * @param force true to bypass cache
     * @param includeRules include cvars
     * @returns 
     */
    public async refresh(force = false, includeRules = false) {
        const now = Date.now()
        if(!force && now - this.#lastRefresh < MIN_REFRESH_TIME) return
        this.#lastRefresh = now
        try {
            const state = await Gamedig.query({
              type: this.#info.type as Gamedig.Type,
              host: this.#info.ip,
              port: this.#info.port,
              givenPortOnly: true,
              maxAttempts: 1,
              socketTimeout: 3000,
              attemptTimeout: 5000,
              requestRules: includeRules
            })
            const raw = state.raw as any
            if(includeRules && raw.rules) {
              this.#cvars = raw.rules
            }
            this.#status.data = {
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
            this.#status.online = true
            return {
              cvars: this.#cvars
            }
        } catch(err) {
          this.#status.data = null
          this.#status.online = false
        }
    } 
}