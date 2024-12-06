import { Rcon, RconOptions } from "rcon-client";
import Feature from "./Feature.js";
import Server from "../Server.js";
import Influx, { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client'
import { getWriter } from "../../../modules/Influx.js";
import { ComputeStats, NetworkStats, ServerStatusData, ServerStatusSource } from "../../../../../common-types/Server.js";
import { AnnotationX, AnnotationY, GAME_DIFFICULTY_STRINGS, GameState } from "../../../../../common-types/Live.js";
import DockerServer from "../DockerServer.js";
import { ContainerStats } from "dockerode";
import { Server_Metric, Server_MetricFull } from "../../../../../common-types/ServerWebsocket.js";

const RECORD_STATISTICS_INTERVAL = 1000 * 60 * 1
// The maximum number of statistics to hold
const MAX_STATS_HISTORY = 400
// Number of miliseconds between every history addition
const STATS_HISTORY_INTERVAL = 1000 * 15

export interface InfluxConfig {
  host: string,
  port?: number,
  protocol?: "http" | "https"
  database: string
}

export default class MetricsFeature extends Feature {
    #influx: WriteApi | null = null
    #latestComputeStats: ComputeStats | null = null

    #computeStatsHistory: ComputeStats[] = []
    #lastHistoryTime: number = 0

    #annotationsX: AnnotationX[] = []
    #annotationsY: AnnotationY[] = []

    constructor(server: Server) {
        super("Metrics", server)
        this.#influx = getWriter()
    }

    get #dockerServer() : DockerServer | null {
      if(this._server instanceof DockerServer) {
        return this._server
      } else {
        return null
      }
    }

    get available() {
        return this.hasInflux || this._server instanceof DockerServer
    }

    get hasInflux() {
      return this.#influx != undefined
    }

    async init() {
      if(!this.available) return
      if(this.#dockerServer) {
        const stream = await this.#dockerServer.ContainerInstance.Container.stats({ stream: true})
        stream.on("data", async (data) => {
          const stats: ContainerStats = JSON.parse(data.toString())
          const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
          const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
          const memoryUsed = stats.memory_stats.usage - stats.memory_stats.stats?.inactive_file
          const collectionTime = Math.round(Date.now()/1000)
          const computeStats: ComputeStats = {
            collectionTime,
            // https://docs.docker.com/reference/api/engine/version/v1.45/#tag/Container/operation/ContainerExport
            cpu_stats: stats.cpu_stats ? {
              cpu_usage: (cpuDelta / systemCpuDelta) * stats.cpu_stats.online_cpus * 100.0,
              online_cpus: stats.cpu_stats.online_cpus
            } : null,
            memory_stats: stats.memory_stats ? {
              usage: memoryUsed,
              usage_percent: (memoryUsed / stats.memory_stats.limit) * 100.0,
              limit: stats.memory_stats.limit
            } : null,
            network_stats: Object.fromEntries(Object.entries(stats.networks).map(([intf, net]) => {
              let rxRate = 0
              let txRate = 0
              if(this.#latestComputeStats?.network_stats) {
                const timeDiff = this.#latestComputeStats.collectionTime - collectionTime
                rxRate = (this.#latestComputeStats?.network_stats[intf].bytesRxTotal - net.rx_bytes) / timeDiff
                txRate = (this.#latestComputeStats?.network_stats[intf].bytesTxTotal - net.tx_bytes) / timeDiff
              }

              return [intf, {
                bytesRxTotal: net.rx_bytes,
                bytesTxTotal: net.tx_bytes,

                bytesRxRate: rxRate,
                bytesTxRate: txRate,

                packetsRx: net.rx_packets,
                packetsTx: net.tx_packets,
                droppedTx: net.tx_errors,
                droppedRx: net.rx_dropped
              } as NetworkStats]
            })) ?? []
          }
          this.#latestComputeStats = computeStats
          // Only record every STATS_HISTORY_INTERVAL, as we don't want to store the last 100ms but the last 100 minutes
          if(Date.now() - this.#lastHistoryTime > STATS_HISTORY_INTERVAL) {
            this._server.broadcastWS({
              type: "metric",
              metric: computeStats
            } as Server_Metric)
            this.#lastHistoryTime = Date.now()
            // TODO: maybe avg?
            this.#computeStatsHistory.push(computeStats)
            if(this.#computeStatsHistory.length > MAX_STATS_HISTORY) {
              this.#computeStatsHistory.splice(0, 1)
            }
        }
        })
      }
    } 

    get ComputeStats(): ComputeStats | null {
      return this.#latestComputeStats
    }

    get ComputeStatsHistory(): ComputeStats[] {
      return this.#computeStatsHistory
    }

    get ComputeStatsHistoryInterval() {
      return STATS_HISTORY_INTERVAL
    }

    get Annotations() {
      return {
          xaxis: this.#annotationsX,
          yaxis: this.#annotationsY,
      }
    }

    /** Return this earliest timestamp of compute stats history */
    get EarliestXTime() {
      return this.#computeStatsHistory[0]?.collectionTime ?? 0
    }

    recordStatus(data: ServerStatusData | null, source: ServerStatusSource) {
      if(!this.hasInflux) return
      const statusPoint = this.#createPoint("status")
      let playerCount: number|null = null
      if(data) {
        playerCount = data.players.length
        if(this._server.uptime)
          statusPoint.intField("uptime", this._server.uptime)
        if(this._server.status.data?.map)
          statusPoint.stringField("map", this._server.status.data.map)
        if(this._server.status.data?.gamemode)
        statusPoint.stringField("gamemode", this._server.status.data.gamemode)
      } 
      if(source == "live" && this._server.Plugin?.available) {
        const live = this._server.Plugin.liveStatus
        if(live) {
          if(live.game?.state === GameState.None) playerCount = Object.keys(live.clients).length
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
          this.#influx!.writePoint(point)
        }
      }
      if(playerCount != null) {
        statusPoint.intField("player_count", playerCount)
      }

      this.#influx!.writePoint(statusPoint)
      this.#influx!.flush()
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


    addAnnotationX(annotation: AnnotationX) {
        this.#annotationsX.push(annotation)
        this.#cleanupOldAnnotations()

        this.broadcastWSFullMetrics()
    }
    addAnnotationY(annotation: AnnotationY) {
        this.#annotationsY.push(annotation)
        
    }

    #cleanupOldAnnotations() {
      const earliestX = this._server.Metrics.EarliestXTime
      this.#annotationsX = this.#annotationsX.filter(a => {
          return a.x >= earliestX
      })
    }

    broadcastWSFullMetrics() {
      this._server.broadcastWS({
        type: "metric_full",
        history: this.#computeStatsHistory,
        annotations: this.Annotations
      } as Server_MetricFull)
    }
}