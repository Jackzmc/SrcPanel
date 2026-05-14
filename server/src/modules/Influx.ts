import { InfluxDB, Point, WriteApi } from "@influxdata/influxdb-client";
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

export function getWriter(defaultTags: Record<string, string> = {}): WriteApi | null {
    if(!influx) return null
    return influx.getWriteApi(process.env.INFLUX_ORG!, process.env.INFLUX_BUCKET!, "ms", {
        defaultTags: {
            panel_hostname: hostname(),
            ...defaultTags
        },
        /* maximum time in millis to keep points in an unflushed batch, 0 means don't periodically flush */
        flushInterval: 30_000,
    })
}
export function sendMetric(metric: string, value: string | number | boolean, labels: Record<string, string> = {}) {
    const writer = getWriter()
    if(!writer) return
    const pt = new Point(metric)
    for(const [label, value] of Object.entries(labels)) {
        pt.tag(label, value)
    }
    if(typeof(value) == "number") {
        pt.floatField(metric, value)
    } else {
        pt.stringField(metric, value)
    }
    writer.writePoint(pt)
}

export class NamespacedMetric {
    metricPrefix: string;
    #writer: WriteApi | null
    constructor(metricPrefix: string, labels: Record<string, string> = {}) {
        this.metricPrefix = metricPrefix
        this.#writer = getWriter(labels)
    }

    /** is influxdb available */
    get available() {
        return this.#writer != null
    }

    /** Attempts to send metric. 'measurement' is added to metricPrefix, metricPrefix_measurement' */
    send(measurement: string, value: string | number | boolean, labels: Record<string, string> = {}): boolean {
        if(!this.#writer) return false
        const pt = new Point(this.metricPrefix)
        for(const [label, value] of Object.entries(labels)) {
            pt.tag(label, value)
        }
        if(typeof(value) == "number") {
            pt.floatField(measurement, value)
        } else {
            pt.stringField(measurement, value)
        }
        this.#writer.writePoint(pt)
        return true
    }
}