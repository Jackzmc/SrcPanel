import { WebSocket } from "@fastify/websocket";
import { SERVER_TYPE_MAP, ServerAction, ServerAvailableFeatures, ServerData, ServerInfo, ServerStatus, ServerStatusData, ServerStatusSource, ServerType, VoiceUser } from "../../../../common-types/Server.js";
import ConfigsFeature from "./features/Configs.js";
import ConsoleFeature from "./features/logs/Console.js";
import MetricsFeature from "./features/Metrics.js";
import PluginFeature from "./features/Plugin.js";
import RconFeature from "./features/Rcon.js";
import ServerGroup from "./groups/ServerGroup.js";
import { ActionResponse, IAction } from "./IAction.js";
import { GameDig } from 'gamedig';
import SocketClientUser from "./SocketClientUser.js";
import { Server_Status, ServerOutPacket, ServerOutPayload } from "../../../../common-types/ServerWebsocket.js";
import { LiveRecordResponse } from "../../../../common-types/Live.js";
import { resolveIPv4, tryResolveIPv4 } from "../../util.js";

const MIN_REFRESH_TIME = 10_000

export interface BaseServerData {
  id : string;
  name: string;
  hostname: {
    public: string,
    internal?: string
  },
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
    ip?: string
    password?: string
    port?: number
  },
  tags: string[],
  actions?: ServerAction[]
}


export interface ConfigServerData extends BaseServerData {
  host: string, // required,
  systemd ? : {
    isUser: boolean;
    serviceName: string;
  },
}

export interface ServerExtendedData extends BaseServerData {
  actions?: ServerAction[]
}


export interface CreateServerOptions {
  id : string;
  name?: string;
  public: {
    host: string,
    port: number
  },
  /// Optional, overrides public host and/or port when used for internal purposes (ex: status) 
  internal?: {
    host?: string,
    port?: number
  }
  game?: string,
  cfgDirectory?: string,
  logsPath?: string,
  activityId?: string,
  sortOrder?: number,
  systemd? : {
    isUser: boolean;
    serviceName: string;
  },
  rcon? : {
    ip?: string
    password: string
    port?: number
  },
  tags?: string[],
  actions?: ServerAction[]
}

export default abstract class Server implements IAction {
  protected _options: CreateServerOptions
  protected _group: ServerGroup

  // Optional / non-universal features:
  protected _rcon: RconFeature|null = null
  protected _configs: ConfigsFeature|null = null
  protected _logs: ConsoleFeature|null = null
  // Core universal features (initalized here):
  protected _plugin: PluginFeature
  protected _metrics: MetricsFeature

  protected _actions: ServerAction[] = []

  protected _status: ServerStatus
  protected _online: boolean = false;
  protected _lastRefresh: number
  protected _gameVersion: string | null


  #gamedig: GameDig

  protected _wsClients: SocketClientUser[] = []
  #activeVoiceMembers: VoiceUser[]

  protected publicIp: string // the resolved IP to show end users
  protected internalIp?: string   // the resolved IP to use if set for internal requests (status) instead of internal

    constructor(group: ServerGroup, server: CreateServerOptions, gamedig: GameDig) {
      this.#activeVoiceMembers = []
      this.#gamedig = gamedig
      this._group = group
      this._options = {
        id: server.id,
        name: server.name,
        public: server.public,
        internal: server.internal,
        game: server.game,
        tags: server.tags,
        sortOrder: server.sortOrder,
      }
      this._actions = [...group.Actions ]
      if(server.actions) this._actions = [...this._actions, ...server.actions]
      // this._actions = group.Actions.map(a => {
      //   return {
      //     ...a, 
      //     inherited: true 
      //   } as ServerAction
      // })
        // if(server.actions) {
        //   this._actions = this._actions.concat(server.actions)
        // }
      this._status = { data: null, source: "", lastStatusTime: null, lastEmptyTime: null }
      if(server.cfgDirectory) {
        this._configs = new ConfigsFeature(this, server.cfgDirectory)
      }
      if(server.rcon) {
        this._rcon = new RconFeature(this, {
          host: server.rcon.ip || this.InternalIp,
          password: server.rcon.password,
          port: server.rcon.port
        })
      }
      this._metrics = new MetricsFeature(this)
      this._plugin = new PluginFeature(this)
    }

    async Init(): Promise<void> {
      // Resolve hostnames to IPa ddresses
      this.publicIp = await resolveIPv4(this._options.public.host)
      if(this._options.internal?.host) this.internalIp = await resolveIPv4(this._options.internal?.host)

      await Promise.allSettled([
          this.Console?.init(),
          this.Rcon?.init(),
          this.Configs?.init(),
          this.Plugin?.init(),
          this.Metrics?.init()
      ])
    }

    get Console(): ConsoleFeature | null { return this._logs }
    get Rcon(): RconFeature | null { return this._rcon }
    get Configs(): ConfigsFeature | null { return this._configs }
    get Plugin(): PluginFeature { return this._plugin }
    get Metrics(): MetricsFeature { return this._metrics }

    /** If an internal ip is set, returns that, otherwise public IP */
    get InternalIp() {
      return this.internalIp ?? this.publicIp
    }
    get InternalPort() {
      return this._options.internal?.port ?? this._options.public.port
    }
    get PublicIp() {
      return this.publicIp
    }
    
    get id(): string { return this._options.id }
    get name(): string|undefined { return this._options.name }
    get host(): string { return this._options.public.host }
    get ip(): string { return this.publicIp }
    get port(): number { return this._options.public.port }
    get game(): string { return this._options.game ?? this._group.Game! }
    get actions(): ServerAction[] { return this._actions }
    get sortOrder(): number { return this._options.sortOrder ?? 0 }
    get group() { return this._group }
    get tags(): string[] { return this._options.tags ?? [] }
    get info(): ServerInfo {
      return {
        game: this.game,
        type: this.game,
        features: this.features,
        actions: this.actions,
        online: this._online,
        status: this._status,
        tags: this.tags,
        sortOrder: this.sortOrder,
        port: this._options.public.port,
        id: this._options.id,
        name: this._options.name,
        ip: this.ip
      }
    }

    /**
     * Can this server perform commands (has rcon support, plugin support, or running on docker)
     *
     * @readonly
     * @type {boolean}
     */
    abstract get canPerformCommands(): boolean;

    /**
     * Returns the unix timestamp of when the server was started, if known.
     * @readonly
     */
    abstract get startTime(): number | null;

    /**
     * Returns the server uptime in seconds, if known
     * @readonly
     */
    get uptime(): number | null {
        if(!this.startTime) return null
        return (Date.now()/1000) - this.startTime
    }

    get Online() {
      return this._online;
    }

    get WebsocketViewers() {
      return this._wsClients.length
    }

    /**
     * Returns the unix timestamp of the last time the status was updated, if any.
     * @readonly
     */
    get lastStatusTime(): number | null {
      return this._status.lastStatusTime
    }
    
    get status(): ServerStatus {
        return this._status
    }

    /**
     * The number of seconds that this server has been detected empty, if known
     * @readonly
     * @type {number}
     */
    get emptyTime(): number | null {
      if(!this._status || !this._status.lastEmptyTime) return null
      return (Date.now()/1000) - this._status.lastEmptyTime
    }

    get activityLogId() { return this._options.activityId }

    /** Current version of game server, if detected from status / docker / etc */
    get GameVersion(): string | null {
      return this._gameVersion
    }
    set GameVersion(version: string) {
      this._gameVersion = version
    }

    /** Returns all features server supports currently */
    public get features(): ServerAvailableFeatures {
      return {
        rcon: this.Rcon?.available ?? false,
        logs: this.Console?.available ?? false,
        configs: this.Configs?.available ?? false,
        plugin: this.Plugin?.available ?? false,
        metrics: this.Metrics?.available ?? false,
        docker: false,

        performCommands: this.canPerformCommands,
        canStart: false
      }
    }

    abstract start(): Promise<void>;
    abstract stop(force: boolean): Promise<boolean>;
    abstract stopWait(force: boolean, timeoutSeconds: number): Promise<boolean>;

    abstract performAction(command: string, namespace: string): Promise<ActionResponse>;

    async refreshStatus( bypassCache: boolean = false): Promise<void> {
        // Don't need to do a refresh if we have plugin data
        if(this.Plugin && this.Plugin.authenticated) return;
        await this.getStatus(bypassCache, this.game, this.InternalIp, this.InternalPort)
    }

    addWSClient(client: SocketClientUser) {
      console.log("added client", client.user.steamid2)
      this._wsClients.push(client)
      // Send all data the client should know right away
      this.broadcastWS({
        type: "status",
        status: this._status,
        online: this.Online
      } as Server_Status)
      this.Metrics.broadcastWSFullMetrics()
      this.Console?.sendHistory(client)
    }
    removeWSClient(client: SocketClientUser) {
      const indexOf = this._wsClients.indexOf(client)
      if(indexOf > -1)
        this._wsClients.splice(indexOf, 1)
    }
    broadcastWS(payload: ServerOutPayload) {
      const packet = {
        ...payload,
        millis: Date.now(),
      } as ServerOutPacket
      this._wsClients.forEach(client => {
        client.sendPacket(packet)
      })
    }


    protected async getStatus(bypassCache: boolean, type: string, host: string, port: number) {
      const now = Date.now()
      if(!bypassCache && this._lastRefresh && now - this._lastRefresh < MIN_REFRESH_TIME) return
      this._lastRefresh = now
      try {
          const state = await this.#gamedig.query({
            type: type,
            host: host,
            port: port,
            givenPortOnly: true,
            socketTimeout: 3000,
            attemptTimeout: 5000,
          })
          const raw = state.raw as any
          this.updateStatus({
            players: state.players
              .filter(p => p.name && p.name.length > 0) // Some names are just "", assumingly bots?
              .map(p => p.name!),
            maxplayers: state.maxplayers,
            map: state.map,
            gamemode: raw.tags ? raw.tags[0] : undefined
          }, "gamedig")
          this._online = true
      } catch(err) {
        if(!err.message.includes("Failed all ")) {
          console.error(`[Server/${this.id}] host=${host} getStatus error: `, err)
        }
        this.updateStatus(null, "gamedig")
      }
    }

    updateStatus(data: ServerStatusData | null = null, source: ServerStatusSource) {
      // console.log(this.id, source, data)
      this._status.data = data
      this._status.source = source
      this._status.lastStatusTime = (Date.now() / 1000)
      this.broadcastWS({
        type: "status",
        status: this._status,
        online: this.Online
      } as Server_Status)
      if(data) {
        if(data.players.length === 0) {
          if(this._status.lastEmptyTime == null)
            this._status.lastEmptyTime = data.players.length === 0 ? (Date.now() / 1000) : null
        } else {
          this._status.lastEmptyTime = null
        }
      }
      if(this.Metrics.available && this.Metrics.hasInflux) {
        this.Metrics.recordStatus(data, source)
      }
    }

    markVoiceConnection(user: VoiceUser, connected: boolean) {
      let memberIndex = this.#activeVoiceMembers.findIndex(m => m.id === user.id)
      if(connected) {
          // Connected
          if(memberIndex == -1) {
            this.#activeVoiceMembers.push(user)
            this.Plugin?.Socket?.send(LiveRecordResponse.VoiceState, user.id, user.name, true)
            this.broadcastWS({
              type: "voice_state",
              userId: user.id,
              userName: user.name,
              connected: true
            })
          }
      } else if(!connected && memberIndex > -1) {
          // Disconnected
          this.#activeVoiceMembers.splice(memberIndex, 1)
          this.Plugin?.Socket?.send(LiveRecordResponse.VoiceState, user.id, user.name, false)
          this.broadcastWS({
            type: "voice_state",
            userId: user.id,
            userName: user.name,
            connected: false
          })
      }
    }

    get isVoiceActive() {
      return this.#activeVoiceMembers.length > 0
    }

    get voiceMembers(): VoiceUser[] {
      return this.#activeVoiceMembers
    }

}
