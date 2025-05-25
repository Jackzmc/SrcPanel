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

const MIN_REFRESH_TIME = 10_000

export interface BaseServerData {
  id : string;
  name: string;
  host: string,
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
  host: string, // required,
  systemd ? : {
    isUser: boolean;
    serviceName: string;
  },
}

export interface ServerExtendedData extends BaseServerData {
  actions?: ServerAction[]
}

export interface RconData {
  password: string
}

interface InternalServerInfo extends ServerData {
    tags: string[],
    status?: ServerStatus,
    sortOrder: number,
}

export default abstract class Server implements IAction {
    protected _info: InternalServerInfo
    protected _group: ServerGroup
    protected _logId?: string
    protected _gameVersion: string | null

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

    #gamedig: GameDig

    protected _wsClients: SocketClientUser[] = []
    #activeVoiceMembers: VoiceUser[]

    constructor(group: ServerGroup, server: ServerExtendedData, gamedig: GameDig) {
      this.#activeVoiceMembers = []
        this.#gamedig = gamedig
        this._group = group
        this._info = {
          id: server.id,
          name: server.name,
          host: server.host,
          ip: server.ip,
          port: server.port,
          type: group.Type || /* legacy */ server.type,
          tags: server.tags,
          sortOrder: server.sortOrder ?? 0,
        }
        this._logId = server.activityId
        this._actions = group.Actions.map(a => {
          return {
            ...a, 
            inherited: true 
          } as ServerAction
        })
        if(server.actions) {
          this._actions = this._actions.concat(server.actions)
        }
        this._status = { data: null, source: "", lastStatusTime: null, lastEmptyTime: null }
        if(server.cfgDirectory) {
          this._configs = new ConfigsFeature(this, server.cfgDirectory)
        }
        this._metrics = new MetricsFeature(this)
        this._plugin = new PluginFeature(this)
    }

    async init(): Promise<void> {
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
    
    get id() { return this._info.id }
    get name() { return this._info.name }
    get host() { return this._info.host }
    get ip() { return this._info.ip }
    get port() { return this._info.port }
    get type() { return this._info.type }
    get actions() { return this._actions }
    get sortOrder() { return this._info.sortOrder }
    get group() { return this._group }
    get tags(): string[] { return this._info.tags }
    get info(): ServerInfo {
      return {
        ...this._info,
        type: SERVER_TYPE_MAP[this._info.type] ?? this._info.type,
        features: this.features,
        actions: this.actions,
        online: this._online,
        status: this._status
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

    get activityLogId() { return this._logId }

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
        await this.getStatus(bypassCache, this.type, this.ip, this.port)
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
