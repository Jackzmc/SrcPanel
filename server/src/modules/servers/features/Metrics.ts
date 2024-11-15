import { Rcon, RconOptions } from "rcon-client";
import Feature from "./Feature.js";
import Server from "../Server.js";
import Influx, { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client'
import { getWriter } from "../../../modules/Influx.js";
import { ComputeStats, ServerStatusData, ServerStatusSource } from "../../../../../common-types/Server.js";
import { GAME_DIFFICULTY_STRINGS, GameState } from "../../../../../common-types/Live.js";
import DockerServer from "../DockerServer.js";
import { ContainerStats } from "dockerode";

const RECORD_STATISTICS_INTERVAL = 1000 * 60 * 1

export interface InfluxConfig {
  host: string,
  port?: number,
  protocol?: "http" | "https"
  database: string
}

export default class MetricsFeature extends Feature {
    #influx: WriteApi | null = null
    #computeStats: ComputeStats | null = null

    constructor(server: Server) {
        super("Metrics", server)
        this.#influx = getWriter()
    }

    get available() {
        return this.hasInflux || this._server instanceof DockerServer
    }

    get hasInflux() {
      return this.#influx != undefined
    }

    async init() {
      if(!this.available) return
      console.log('init', this._server.id, this._server instanceof DockerServer)
      if(this._server instanceof DockerServer) {
        // TODO: replace interval with stream
        setInterval(async() => {
          await this.getComputeStats()
        }, RECORD_STATISTICS_INTERVAL)
        await this.getComputeStats()
      }
      // setInterval(() => {
      //   this.#recordInfo()
      // }, Number(process.env.INFLUX_METRICS_INTERVAL) || 10_000)
    } 

    /**
     * Computes stats, if available. Currently only DockerServer supported
     * @returns
     */
    async getComputeStats(): Promise<ComputeStats> {
      if(this._server instanceof DockerServer) {
        const stats = await this._server.ContainerInstance.Container.stats({ "one-shot": true, stream: false })
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
        const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
        this.#computeStats = {
          collectionTime: Math.round(Date.now()/1000),
          // https://docs.docker.com/reference/api/engine/version/v1.45/#tag/Container/operation/ContainerExport
          cpu_stats: stats.cpu_stats ? {
            cpu_usage: (cpuDelta / systemCpuDelta) * stats.cpu_stats.online_cpus * 100.0,
            system_cpu_usage: stats.cpu_stats.system_cpu_usage,
            online_cpus: stats.cpu_stats.online_cpus
          } : null,
          memory_stats: stats.memory_stats ? {
            max_usage: stats.memory_stats.max_usage,
            usage: stats.memory_stats.usage - stats.memory_stats.stats.cache,
            limit: stats.memory_stats.limit
          } : null
        }
        return this.#computeStats
      } else {
        return null
      }
    }

    get ComputeStats(): ComputeStats | null {
      return this.#computeStats
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
      if(!this.hasInflux) throw new Error("No influx support enabled")
      const point = new Point(measurement)
      point.tag("server_id", this._server.id)
      point.tag("server_ip", this._server.ip)
      point.tag("server_port", this._server.port.toString())
      point.tag("server_type", this._server.type)
      return point
    }
}