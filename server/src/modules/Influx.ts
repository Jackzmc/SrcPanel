import { InfluxDB, WriteApi } from "@influxdata/influxdb-client";
import dotenv from 'dotenv'
dotenv.config()

import {Agent} from 'http'
import { hostname } from "os";
const keepAliveAgent = new Agent({
  keepAlive: true, // reuse existing connections
  keepAliveMsecs: 20 * 1000, // 20 seconds keep alive
})
process.on('exit', () => keepAliveAgent.destroy())

let influx: InfluxDB
if(process.env.INFLUX_URL && process.env.INFLUX_TOKEN) {
    if(!process.env.INFLUX_ORG || !process.env.INFLUX_BUCKET) {
        console.error("[Influx] ERROR: No INFLUX_ORG or INFLUX_BUCKET set")
    } else {
        influx = new InfluxDB({
            url: process.env.INFLUX_URL,
            token: process.env.INFLUX_TOKEN,
            transportOptions: {
                agent: keepAliveAgent,
            },
        })
        console.info('Influx connected to', process.env.INFLUX_URL)
    }
} else {
    console.debug('Influx: no env variables found, disabled')
}

export function getWriter(): WriteApi | null {
    if(!influx) return null
    return influx.getWriteApi(process.env.INFLUX_ORG!, process.env.INFLUX_BUCKET!, "ms", {
        defaultTags: {
            panel_hostname: hostname()
        },
        /* maximum time in millis to keep points in an unflushed batch, 0 means don't periodically flush */
        flushInterval: 30_000,
    })
}