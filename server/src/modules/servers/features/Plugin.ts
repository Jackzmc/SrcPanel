import { AnnotationX, AnnotationY, GameState, LiveDataCache, LiveRecord, LiveRecordCommandResponse, LiveRecordGame, LiveRecordResponse, LiveRecordType, updateLiveCache } from "../../../../../common-types/Live.js";
import { ActionResponse, IAction } from "../IAction.js";
import Server from "../Server.js";
import PluginSocket from "../PluginSocket.js";
import Feature from "./Feature.js";
import { ServerStatus, ServerStatusData } from "../../../../../common-types/Server.js";
import jwtPromise from "../../../jwt-promise.js";

const LIVE_CACHE_TTL = 1000 * 60 * 3 // Live cache data expires after 3 minutes

export default class PluginFeature extends Feature implements IAction {
    #liveCache: LiveDataCache | null = null
    #socket: PluginSocket | null = null
    #startTime: number
    #status: ServerStatusData

    constructor(server: Server) {
        super("LivePlugin", server)
        this.#status = {
            players: [],
            maxplayers: 0,
            gamemode: "",
            map: ""
        }
    }

    async init() {

    }
    /** Are we connected to game plugin? */
    get available() {
        return this.#socket != undefined
    }
    /** Are we authenticated (and ready) with plugin? */
    get authenticated() {
        return this.available && this.#socket?.Authenticated
    }

    /** Current live data */
    get liveStatus(): LiveDataCache | null { 
      if(this.#liveCache) {
        // Purge cache if no update in a while
        if(Date.now() - this.#liveCache.lastUpdate > LIVE_CACHE_TTL) {
          this.#liveCache = null
          // Purge status if we recorded it
          if(this._server.status.source === "live")
            this._server.status.data = null
        }
      }
      return this.#liveCache
    }

    /** The PluginSocket instance this feature belongs to */
    get Socket() {
        return this.#socket
    }

    _setSocket(socket: PluginSocket | null) {
        this._server.Metrics.addAnnotationX({
            x: Date.now(),
            label: {
                text: socket != null ? "Plugin connected" : "Plugin disconnected",
                orientation: "horizontal"
            }
        })
        this.#socket = socket
    }

    get startTime() {
        return this.#startTime
    }

    /** Adds an annotation to metric feature on game state changes */
    #annotateGameState(record: LiveRecordGame) {
        let text: string
        let timestamp: number|undefined = undefined
        switch(record.state) {
            case GameState.None: {
                if(this.#liveCache?.game?.state === GameState.Hibernating) {
                    text = "Stopped hibernating"
                } else {
                    return
                }
            }
            case GameState.NewGame: {
                text = "New game started"
                timestamp = record.campaignStartTime * 1000 // convert to millis
                break
            } case GameState.Hibernating:
                text = "Hibernating"
                break
            case GameState.EndGame:
                text = "Game ended"
                break
            case GameState.Transitioning:
                // Only trigger once per transition
                if(this.#liveCache?.game?.state === GameState.Transitioning) return

                text = "Level transition"
        }
        if(!timestamp) timestamp = Date.now()
        console.log("recording annotation", record.state, record.campaignStartTime)
        this._server.Metrics.addAnnotationX({
            x: timestamp,
            label: {
                text,
                orientation: "horizontal"
            }
        })
    }

    /** Process a new incoming record, typically from PluginSocket */
    async pushRecord(record: LiveRecord | null) {
        // If record is null, it means shutdown is happening
        this._server.broadcastWS({
            type: "live",
            record: record
        })
        if(record) {
            this.#liveCache = updateLiveCache(this.#liveCache, record)
            if(record.type === LiveRecordType.Game) {
                this.#annotateGameState(record)
                // campaignStartTime is the end time for GameState.EndGame, instead of normal start time
                if(record.state !== GameState.EndGame && this.#liveCache.game) {
                    this.#liveCache.game.campaignStartTime = record.campaignStartTime
                }
                this.#startTime = record.startTime
            }
            // Reset server status with dummy data
            if(!this.#status) this.#status = { players: [], maxplayers: 0, map: "", gamemode: "" }

            if(this.#liveCache.game) {
                this.#status.gamemode = this.#liveCache.game.gamemode
                this.#status.map = this.#liveCache.game.map
                // Only want to update maxplayers when transitioning or start of game?
                // if(this.#liveCache.game.state !== 0)
                this.#status.maxplayers = this.#liveCache.game.maxplayers || 4
            }
            // Calculate the number of players online
            if(this.#liveCache.clients) {
                // only update if players is not hibernate/transitioning or unk game state
                this.#status.players = Object.values(this.#liveCache.clients)
                    .filter(pl => pl.steamid != "BOT"/* && ('survivor' in pl || 'ínfected' in pl)*/)
                    .map(pl => pl.name)
                // console.log(`LIVE players=${this.#status.data.players.length} / ${this.#status.data.maxplayers}`)
            }
            this._server.updateStatus(this.#status, "live")
        }
    }

    /** Perform an action via game plugin */
    async performAction(command: string, namespace = "default"): Promise<ActionResponse> {
        if(!this.authenticated) {
            throw new Error("Not connected or authenticated to plugin socket")
        }
        const response = await this.#socket!.send(LiveRecordResponse.RunCommand, command, namespace)
        if(!response) throw new Error("Got no response")
        return {
            type: response.resultType,
            result: response.result,
            message: response.message
        }
    }

    /** Generates a token to authenticate a game plugin and map game server to panel server */
    async generateToken(issuer?: string) {
        if(!process.env.STATE_SECRET) {
            throw new Error("No JWT secret provided in process.env.STATE_SECRET")
        }
        return await jwtPromise.sign({
            // Use group for docker
            sub: this._server.features.docker ? this._server.group.Id : this._server.id,
            iat: Math.round(Date.now()/1000),
            iss: issuer,
            // Mark if this is a docker server, which means to check port rather than map 1:1
            docker: this._server.features.docker
        }, process.env.STATE_SECRET)
    }
}