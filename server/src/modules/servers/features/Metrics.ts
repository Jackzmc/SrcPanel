import Feature from "./Feature.js";
import Server from "../Server.js";
import { Point, WriteApi } from '@influxdata/influxdb-client'
import { getGlobalWriter, NamespacedMetric } from "../../../modules/Influx.js";
import { ComputeStats, NetworkStats, ServerStatusData, ServerStatusSource } from "@jzpanel/common/Server";
import { AnnotationX, AnnotationY, GAME_DIFFICULTY_STRINGS, GameState, InfectedClass, PlayerGameAction, PlayerMove, PlayerState } from "@jzpanel/common/Live";
import DockerServer from "../DockerServer.js";
import { ContainerStats } from "dockerode";
import { Server_Metric, Server_MetricFull } from "@jzpanel/common/ServerWebsocket";

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
    #latestComputeStats: ComputeStats | null = null

    #computeStatsHistory: ComputeStats[] = []
    #lastHistoryTime: number = 0

    #annotationsX: AnnotationX[] = []
    #annotationsY: AnnotationY[] = []

    #metric: NamespacedMetric

    constructor(server: Server) {
        super("Metrics", server)
        this.#metric = new NamespacedMetric(`servers`, { 
          server_id: server.id, 
          game: server.game 
        })
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
      return getGlobalWriter() != null
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
            network_stats: stats.networks ? Object.fromEntries(Object.entries(stats.networks).map(([intf, net]) => {
              let rxRate = 0
              let txRate = 0
              if(this.#latestComputeStats?.network_stats[intf]) {
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
            })) : {}
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

    /**
     * Records metrics for current status
     * @param data 
     * @param source 
     */
    // Called periodically by gamedig check system
    recordStatus(data: ServerStatusData | null, source: ServerStatusSource) {
      if(!this.hasInflux) return
      // Defaults to gamedig's value, but overwritten by live as source of truth
      let playerCount: number|null = null
      if(data) {
        playerCount = data.players.length
        const difficulty = this._server.Plugin?.liveStatus?.game?.difficulty
        // TODO: maybe solution incase there is no uptime?
        if(this._server.uptime)
          this.#metric.send("uptime_secs", this._server.uptime, {
            map: this._server.status.data?.map, 
            gamemode: this._server.status.data?.gamemode,
            difficulty: difficulty?.valueOf().toString(),
            difficulty_str: difficulty ? GAME_DIFFICULTY_STRINGS[difficulty]! : undefined
          })
      } 
      if(source == "live" && this._server.Plugin?.available) {
        const live = this._server.Plugin.liveStatus
        if(live) {
          // Overwrite player count with live as source of truth
          if(live.game?.state === GameState.None) playerCount = Object.keys(live.clients).length
          else playerCount = null

          const survivors = Object.values(live.clients).filter(cl => 'survivor' in cl && cl.survivor)
          const realClients = Object.values(live.clients).filter(cl => cl.steamid != 'BOT')

          // Only record game_duration if we actually got clients
          if(live.game && realClients.length > 0) {
            // campaignStartTime is in milliseconds
            const durationSec = (Date.now()/1000) - live.game.campaignStartTime
            this.#metric.send("game_duration_sec", Math.round(durationSec))
          }

          const tanksInPlay = Object.values(live.clients).reduce((pv, cv) => 'infected' in cv && cv.infected?.class == InfectedClass.Tank ? pv + 1 : pv, 0)
          this.#metric.send("tanks_in_play", tanksInPlay, { finale: live.finale != undefined})
          const playersIncapped = Object.values(survivors).reduce((pv, cv) => cv.survivor!.move == PlayerMove.Incapped ? pv + 1 : pv, 0)
          this.#metric.send("players_incapped", playersIncapped)
          if(survivors.length > 0) {
            const avgSurvFlow = Object.values(survivors).reduce((pv, cv) => pv + cv.survivor!.flowPercent, 0)
            this.#metric.send("map_avg_flow", avgSurvFlow / survivors.length)
          }

          if(live.finale) {
            this.#metric.send("finale_stage", live.finale.stage, { 
              difficulty: live.game?.difficulty.valueOf().toString() 
            })
          }

          const counts = { survivors: 0, infected: 0 }
          for(const client of Object.values(live.clients)) {
            if(client.infected) counts.infected++
            else if(client.survivor) counts.survivors++
          }
          this.#metric.send("survivor_count", counts.survivors)
          this.#metric.send("infected_count", counts.infected)
        }
      }
      // We know player count from live OR gamedig - so we can always send it
      if(playerCount != null) {
        this.#metric.send("player_count", playerCount)
      }
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

    recordClientCount(count: number) {
      this.#metric.send("live_viewers", count)
    }
}