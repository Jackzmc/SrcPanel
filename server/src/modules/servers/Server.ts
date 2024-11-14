import { ServerAction, ServerAvailableFeatures, ServerData, ServerInfo, ServerStatus, ServerStatusData, ServerStatusSource, ServerType } from "../../../../common-types/Server.js";
import ConfigsFeature from "./features/Configs.js";
import ConsoleFeature from "./features/console/Console.js";
import MetricsFeature from "./features/Metrics.js";
import PluginFeature from "./features/Plugin.js";
import RconFeature from "./features/Rcon.js";
import ServerGroup from "./groups/ServerGroup.js";
import { ActionResponse, IAction } from "./IAction.js";
import Gamedig from 'gamedig';
import {InfluxDB } from '@influxdata/influxdb-client'

const MIN_REFRESH_TIME = 5000

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
    protected _logId: string | null

    protected _console: ConsoleFeature|null = null
    protected _rcon?: RconFeature|null = null
    protected _configs?: ConfigsFeature|null = null
    protected _plugin?: PluginFeature|null = null
    protected _metrics?: MetricsFeature|null = null

    protected _actions: ServerAction[] = []

    protected _status: ServerStatus
    protected _lastRefresh: number

    constructor(group: ServerGroup, server: ServerExtendedData) {
        this._group = group
        this._info = {
          id: server.id,
          name: server.name,
          domain: server.domain,
          ip: server.ip,
          port: server.port,
          type: group.Type || /* legacy */ server.type,
          tags: server.tags,
          sortOrder: server.sortOrder,
          // TODO: remove
        }
        this._actions = group.Actions.map(a => {
          return {
            ...a, 
            inherited: true 
          } as ServerAction
        }).concat(server.actions)
        this._status = { data: null, online: false, source: "" }
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

    get Console(): ConsoleFeature | null { return this._console }
    get Rcon(): RconFeature | null { return this._rcon }
    get Configs(): ConfigsFeature | null { return this._configs }
    get Plugin(): PluginFeature | null { return this._plugin }
    get Metrics(): MetricsFeature | null { return this._metrics }
    
    get id() { return this._info.id }
    get name() { return this._info.name }
    get domain() { return this._info.domain }
    get ip() { return this._info.ip }
    get port() { return this._info.port }
    get type() { return this._info.type }
    get actions() { return this._actions }
    get sortOrder() { return this._info.sortOrder }
    get group() { return this._group }
    get tags(): string[] { return this._info.tags }
    get info() {
      return {
        ...this._info,
        features: this.features,
        actions: this.actions
      }
    }

    abstract get canPerformCommands(): boolean;

    abstract get startTime(): number | null;
    abstract get uptime(): number | null;

    get status(): ServerStatus {
        return this._status
    }

    get activityLogId() { return this._logId }

    /** Returns all features server supports currently */
    public get features(): ServerAvailableFeatures {
      return {
        rcon: this.Rcon?.available ?? false,
        console: this.Console?.available ?? false,
        configs: this.Configs?.available ?? false,
        plugin: this.Plugin?.available ?? false,
        metrics: this.Metrics?.available ?? false,
        docker: false,
        performCommands: this.canPerformCommands
      }
    }

    abstract start(): Promise<void>;
    abstract stop(force: boolean): Promise<boolean>;
    abstract stopWait(force: boolean, timeoutSeconds: number): Promise<boolean>;

    abstract performAction(command: string, namespace: string): Promise<ActionResponse>;

    async refreshStatus( bypassCache: boolean = false): Promise<void> {
        // Don't need to do a refresh if we have plugin data
        if(this.Plugin && this.Plugin.authenticated) return;

        const now = Date.now()
        if(!bypassCache && now - this._lastRefresh < MIN_REFRESH_TIME) return
        this._lastRefresh = now
        try {
            const state = await Gamedig.query({
              type: this.type as Gamedig.Type,
              host: this.ip,
              port: this.port,
              givenPortOnly: true,
              maxAttempts: 1,
              socketTimeout: 3000,
              attemptTimeout: 5000,
            })
            const raw = state.raw as any
            this.updateStatus(true, {
              players: state.players
                .filter(p => p.name.length > 0) // Some names are just "", assumingly bots?
                .map(p => p.name),
              maxplayers: state.maxplayers,
              map: state.map,
              gamemode: raw.tags ? raw.tags[0] : undefined
            }, "gamedig")
        } catch(err) {
          if(!err.message.includes("Failed all ")) {
            console.error(`[Server/${this.id}] refresh() Error:`, err)
          }
          this.updateStatus(false)
        }
    }

    updateStatus(online: boolean, data: ServerStatusData = null, source: ServerStatusSource = "") {
      this._status.online = online
      this._status.data = data
      this._status.source = source
      if(this.Metrics?.available) {
        this.Metrics.recordStatus(data, source)
      }
    }
}
