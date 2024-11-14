import { Rcon, RconOptions } from "rcon-client";
import Feature from "./Feature.js";
import Server from "../Server.js";
import Influx, { InfluxDB, ISingleHostConfig } from 'influx'

export interface InfluxConfig {
  host: string,
  port?: number,
  protocol?: "http" | "https"
  database: string
}

export default class MetricsFeature extends Feature {
    #influx: InfluxDB
    #available: boolean
    #connected: boolean

    constructor(server: Server, options: InfluxConfig) {
        super("Metrics", server)
        this.#influx = new InfluxDB({
          host: options.host,
          port: options.port ?? 8086,
          protocol: options.protocol ?? "http",
          database: options.database,
          schema: [
            {
              measurement: 'player_counts',
              fields: {
                count: Influx.FieldType.INTEGER
              },
              tags: [
                'id'
              ]
            }
          ]
        })
    }

    get available() {
        return true
    }


    async init() {
    }

    record({ count: number }) {

    }

}