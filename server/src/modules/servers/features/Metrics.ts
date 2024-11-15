import { Rcon, RconOptions } from "rcon-client";
import Feature from "./Feature.js";
import Server from "../Server.js";
import Influx, { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client'
import { getWriter } from "../../../modules/Influx.js";
import { ServerStatusData, ServerStatusSource } from "../../../../../common-types/Server.js";
import { GAME_DIFFICULTY_STRINGS, GameState } from "../../../../../common-types/Live.js";

export interface InfluxConfig {
  host: string,
  port?: number,
  protocol?: "http" | "https"
  database: string
}

export default class MetricsFeature extends Feature {
    #influx: WriteApi | null = null

    constructor(server: Server) {
        super("Metrics", server)
        this.#influx = getWriter()
    }

    get available() {
        return this.#influx != undefined
    }


    async init() {
      if(!this.available) return
      // setInterval(() => {
      //   this.#recordInfo()
      // }, Number(process.env.INFLUX_METRICS_INTERVAL) || 10_000)
    }

    recordStatus(data: ServerStatusData | null, source: ServerStatusSource) {
      const statusPoint = this.#createPoint("status")
      let playerCount = null
      if(data) {
        playerCount = data.players.length
        if(this._server.uptime)
          statusPoint.intField("uptime", this._server.uptime)
        statusPoint.stringField("map", this._server.status.data.map)
        statusPoint.stringField("gamemode", this._server.status.data.gamemode)
      } 
      if(source == "live" && this._server.Plugin?.available) {
        const live = this._server.Plugin.liveStatus
        if(live) {
          if(live.game.state === GameState.None) playerCount = Object.keys(live.clients).length
          else playerCount = null
          const point = this.#createPoint("live")
          if(live.game) {
            point.stringField("difficulty", GAME_DIFFICULTY_STRINGS[live.game.difficulty])
          }
          let survivors = 0, infected = 0
          for(const client of Object.values(live.clients)) {
            if(client.infected) infected++
            else if(client.survivor) survivors++
          }
          point.intField("survivor_count", survivors)
          point.intField("infected_count", infected)
          this.#influx.writePoint(point)
        }
      }
      if(playerCount != null) {
        statusPoint.intField("player_count", playerCount)
      }

      this.#influx.writePoint(statusPoint)
      this.#influx.flush()
    }


    #createPoint(measurement: string) : Point {
      const point = new Point(measurement)
      point.tag("server_id", this._server.id)
      point.tag("server_ip", this._server.ip)
      point.tag("server_port", this._server.port.toString())
      point.tag("server_type", this._server.type)
      return point
    }
}