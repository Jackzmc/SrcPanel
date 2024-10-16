import Gamedig from 'gamedig';
import { open, readdir } from 'fs/promises'
import { join, resolve } from 'path'
import { statSync } from 'fs';
import { GroupInfo, PlayerStats, SERVER_TYPE_MAP, ServerAction, ServerAvailableFeatures, ServerData, ServerFeature, ServerInfo, ServerStatus, ServerType } from '../../../../common-types/Server.js';
import { LiveRecord, LiveDataCache, updateLiveCache, LiveRecordType, LiveRecordResponse, CommandResultType, LiveRecordCommandResponse } from '../../../../common-types/Live.js';
import { EventEmitter } from 'node:events';
import { Tail } from 'tail'
import PluginSocket from './PluginSocket.js';
import { Rcon } from 'rcon-client'
import ServerManager from './ServerManager.js';
import ServerConsole from './ServerConsole.js';

const VALID_CONFIG_EXTS = ["cfg", "toml"]
const MIN_REFRESH_TIME = 5000
// The number of milliseconds until live data expires

export interface BaseServerData {
  id? : string;
  name: string;
  domain? : string;
  ip: string,
  port: number,
  type: string,
  cfgDirectory?: string,
  logsPath?: string,
  activityId?: string,
  sortOrder?: number,
  systemd? : {
    isUser: boolean;
    serviceName: string;
  },
  rcon? : {
    password: {
      env?: string,
      value?: string
    },
    port?: number
  },
  tags: string[],
  actions?: ServerAction[]
}


export interface ConfigServerData extends BaseServerData {
  systemd ? : {
    isUser: boolean;
    serviceName: string;
  },
}

export interface ServerExtendedData extends BaseServerData {
  actions?: ServerAction[]
}

export interface RconData {
  client: Rcon,
  password: string
}
  

const sleep = (time: number) => new Promise(res => setTimeout(res, time));
const MAX_PLAYER_STATS = 300
const MAX_LOGS_LINES = 30
const LIVE_CACHE_TTL = 1000 * 60 * 3 // Live cache data expires after 3 minutes


export default class Server extends EventEmitter { 
    #info: ServerData
    #status: ServerStatus
    #liveCache?: LiveDataCache
    #cfgDir: string
    #actid: string
    #sortOrder: number
    #lastRefresh: number
    #cvars: Record<string, string>
    #startTime: number
    #actions: ServerAction[]
    #group: GroupInfo
    #features: ServerAvailableFeatures = {}
    #systemd?: {
      isUser: boolean;
      serviceName: string;
    } = null;
    #tags: string[];
    #rcon?: RconData

    #console: ServerConsole

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
        this.#actions = group.actions.map(a => {
          return { ...a, inherited: true } as ServerAction
        }).concat(server.actions)
        
        if(server.cfgDirectory) {
          this.#cfgDir = resolve(server.cfgDirectory)
          try {
            statSync(this.#cfgDir)
            this.#features['configs'] = true
          } catch(err) {
            console.error(`[Server/${server.id}] ERROR: Could not access config directory:`, err)
          }
        }
        // Initalize console (log lines, and in future command input)
        this.#console = ServerConsole.createConsole(this, server.logsPath)

        if(server.rcon) this.#setupRcon(server)
      
        this.#systemd = server.systemd
        this.#features['systemd'] = server.systemd != undefined
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

    async #setupRcon(server: ServerExtendedData) {
      let pass = server.rcon.password.value
      if(!pass) pass = process.env[server.rcon.password.env]
      if(pass) {
        this.#rcon = {
          password: pass,
          client: new Rcon({
            host: server.ip,
            port: server.rcon.port ?? server.port,
            password: pass,
          }),
        }
        try {
          await this.#rcon.client.connect()
          this.#features['rcon'] = true
          console.log(`[Server/${server.id}] Initial RCON connection successful`)
        } catch(err) {
          this.#features['rcon'] = false
          console.warn(`[Server/${server.id}] Initial RCON connection failed:`, err.message)
        }
        
      } else {
        console.warn(`[Server/${server.id}] ERROR: Could not find RCON password for ${server.name}`)
      }
    }

    /** Are we connected to the game server via panel plugin? */
    public get SocketConnected() {
      return this.#socket?.Authenticated
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
        if(Date.now() - this.#liveCache.lastUpdate > LIVE_CACHE_TTL) {
          this.#liveCache = null
        }
      }
      return this.#liveCache
    }

    /** The number of active live status viewers */
    public get liveViewers() {
      return this.listenerCount("live")
    }

    public get hasSystemd() { return this.#features.systemd }
    public get hasConfigs() { return this.#features.configs }
    public get hasConsole() { return this.#console != null }
    public get hasRcon() { return this.#features.rcon }
    public get hasPlugin() { return this.#features.plugin }
    public get hasCommandSupport() { return this.#features.plugin || this.#features.rcon }

    /** Returns all features server supports currently */
    public get features(): ServerAvailableFeatures {
      return {
        rcon: this.hasRcon,
        console: this.hasConsole,
        configs: this.hasConfigs,
        systemd: this.hasSystemd,
        plugin: this.hasPlugin,
      }
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
     * Returns the server console if available
    **/
    public get Console() { return this.#console }

    async #connectRcon() {
      if(!this.#rcon) return false
      if(!this.#rcon.client.authenticated) {
        try {
          await this.#rcon.client.connect()
          return true
        } catch(err) {
          console.warn(`[Server/${this.id}] Rcon connection failed:`, err.message)
          return false
        }
      }
      return true
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
          source: "live",
          data: this.#status.data ??  { players: [], maxplayers: 0, map: "", gamemode: "" },
          online: true
        } 
        if(this.#liveCache.game) {
          this.#status.data.gamemode = this.#liveCache.game.gamemode
          this.#status.data.map = this.#liveCache.game.map
          // Only want to update maxplayers when transitioning or start of game?
          // if(this.#liveCache.game.state !== 0)
          this.#status.data.maxplayers = this.#liveCache.game.maxplayers || 4
        }
        if(this.#liveCache.clients) {
          // only update if players is not hibernate/transitioning or unk game state
          this.#status.data.players = Object.values(this.#liveCache.clients)
            .filter(pl => pl.steamid != "BOT"/* && ('survivor' in pl || 'ínfected' in pl)*/)
            .map(pl => pl.name)
          // console.log(`LIVE players=${this.#status.data.players.length} / ${this.#status.data.maxplayers}`)
        }
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
          // Hide filenames ignored by server_files.ignore
          if(!showHidden && await ServerManager.isFileIgnored(dirent.name)) continue

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
      this.#features.plugin = socket != undefined
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

    public async performAction(command: string, namespace = "default"): Promise<LiveRecordCommandResponse> {
      if(this.#socket?.Authenticated) {
        const response = await this.#socket.send(LiveRecordResponse.RunCommand, command, namespace)
        if(!response) throw new Error("Got no response")
        return response
      } else if(this.hasRcon && await this.#connectRcon()) {
        if(namespace === "builtin") command = this.#getFallbackCommandForBuiltin(command)
        if(!command) {
          throw new Error("Command cannot be run at this time (no rcon fallback equivalent)")
        }
        const result = await this.#rcon.client.send(command)
        return {
          type: LiveRecordType.CommandResponse,
          id: null,
          result: 1,
          resultType: CommandResultType.None,
          message: result
        }
      } else {
        throw new Error("Not connected to plugin or RCON")
      }
    }

    /**
     * Converts built in command to actual command for given server. 
     * This allows different game support if the command is different. (minecraft uses "stop" instead of "exit")
     * @param command the built in command, without namespace
     * @returns null for unknown built in
     */
    #getFallbackCommandForBuiltin(command: string): string | null {
      switch(command) {
        case "stop": {
          return "exit"
        }
        case "request_stop": {
          return "sm_panel_request_stop"
        }
        case "kick": {
          return "sm_kick"
        }
        case "ban": {
          return "sm_ban"
        }
        case "unreserve": {
          return "sm_unreserve"
        }
        default: return null
      }
    }

    /**
     * Fetches server information via gamedig, or cache if available and not forced.
     * @param bypassCache true to pull fresh data, bypassing cache
     * @param includeRules include cvars in response? Takes slightly longer, more data
     * @returns 
     */
    public async refresh(bypassCache = false, includeRules = false) {
        // Don't need to do a refresh if we have plugin data
        if(this.hasPlugin) return;

        const now = Date.now()
        if(!bypassCache && now - this.#lastRefresh < MIN_REFRESH_TIME) return
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
            this.#status.source = "gamedig"
            this.#status.data = {
              players: state.players
                .filter(p => p.name.length > 0) // Some names are just "", assumingly bots?
                .map(p => p.name),
              maxplayers: state.maxplayers,
              map: state.map,
              gamemode: raw.tags ? raw.tags[0] : undefined
            }
            console.log(`GAMEDIG players=${state.players.length} / ${state.maxplayers}`)
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