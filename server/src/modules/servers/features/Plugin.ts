import { LiveDataCache, LiveRecord, LiveRecordCommandResponse, LiveRecordResponse, LiveRecordType, updateLiveCache } from "../../../../../common-types/Live.js";
import { ActionResponse, IAction } from "../IAction.js";
import Server from "../Server.js";
import PluginSocket from "../PluginSocket.js";
import Feature from "./Feature.js";
import { ServerStatus } from "../../../../../common-types/Server.js";
import jwtPromise from "../../../jwt-promise.js";

const LIVE_CACHE_TTL = 1000 * 60 * 3 // Live cache data expires after 3 minutes
export type SubscribeCallback = (record: LiveRecord) => void

export default class PluginFeature extends Feature implements IAction {
    #liveCache?: LiveDataCache
    #socket: PluginSocket | null = null
    #subscribers: SubscribeCallback[] = []
    #startTime: number
    #status: ServerStatus
    constructor(server: Server) {
        super("LivePlugin", server)
    }

    async init() {

    }

    get available() {
        return this.#socket != undefined
    }

    get authenticated() {
        return this.available && this.#socket.Authenticated
    }

    get liveStatus(): LiveDataCache { 
      if(this.#liveCache) {
        if(Date.now() - this.#liveCache.lastUpdate > LIVE_CACHE_TTL) {
          this.#liveCache = null
        }
      }
      return this.#liveCache
    }

    get liveViewers() {
        return this.#subscribers.length
    }

    get Socket() {
        return this.#socket
    }

    _setSocket(socket: PluginSocket | null) {
      this.#socket = socket
      if(socket == null) {
        this._server.updateStatus(false, null, "live")
      }
    }

    async subscribe(callback: SubscribeCallback) {
        this.#subscribers.push(callback)
        if(this.#socket && this.#socket.Authenticated) {
            await this.#socket.send(LiveRecordResponse.OK, this.liveViewers)
        }
    }

    unsubscribe(cb: SubscribeCallback) {
        const index = this.#subscribers.findIndex(v => v === cb)
        if(index > -1) {
            this.#subscribers.splice(index, 1)
        }
        return index
    }

    #emit(record: LiveRecord) {
        for(const subCb of this.#subscribers) {
            subCb(record)
        }
    }

    /**
     * Number of subscribers to live view
     *
     * @readonly
     * @memberof Console
     */
    get subscribers() { return this.#subscribers.length }

    get startTime() {
        return this.#startTime
    }

    get status(): ServerStatus {
        return this.#status
    }
    
    async pushRecord(record: LiveRecord) {
        // If record is null, it means shutdown is happening
        this.#emit(record)
        if(record) {
            this.#liveCache = updateLiveCache(this.#liveCache, record)
            if(record.type === LiveRecordType.Game) {
                this.#startTime = record.startTime
            }
            this._server.updateStatus(true, this.#status.data ??  { players: [], maxplayers: 0, map: "", gamemode: "" }, "live")
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

    async performAction(command: string, namespace = "default"): Promise<ActionResponse> {
        if(!this.authenticated) {
            throw new Error("Not connected or authenticated to plugin socket")
        }
        const response = await this.#socket.send(LiveRecordResponse.RunCommand, command, namespace)
        if(!response) throw new Error("Got no response")
        return {
            type: response.resultType,
            result: response.result,
            message: response.message
        }
    }

    async generateToken(issuer?: string) {
        if(!process.env.STATE_SECRET) {
            throw new Error("No JWT secret provided in process.env.STATE_SECRET")
        }
        return await jwtPromise.sign({
            // Use group for docker
            sub: this._server.features.docker ? this._server.group.Id : this._server.id,
            iat: Math.round(Date.now()/1000),
            iss: issuer,
            docker: this._server.features.docker
        }, process.env.STATE_SECRET)
    }
}