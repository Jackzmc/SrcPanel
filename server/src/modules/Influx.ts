import { InfluxDB, Point, WriteApi } from "@influxdata/influxdb-client";
import dotenv from 'dotenv'
import pkg from '../../package.json' with { type: "json" }
import logger from '../logger.js'
const log = logger.child({ name: "influx" })
dotenv.config()

const FLUSH_INTERVAL = process.env.INFLUX_FLUSH_INTERVAL_MS ? parseInt(process.env.INFLUX_FLUSH_INTERVAL_MS) : 30_000

import { Agent as httpAgent } from 'http'
import { AgentOptions, Agent as httpsAgent } from 'https'

const KEEP_ALIVE_OPTIONS: AgentOptions = {
  keepAlive: true, // reuse existing connections
  keepAliveMsecs: 20 * 1000, // 20 seconds keep alive
}

import { hostname } from "os";
const keepAliveAgent = new httpsAgent()
process.on('exit', () => keepAliveAgent.destroy())

function getAgent(url: string, options: AgentOptions) {
    if(url.startsWith("http"))
        return new httpAgent(options)
    else if(url.startsWith("https"))
        return new httpsAgent(options)
    throw new Error("invalid protocol")
}

let influx: InfluxDB;
let _writer: WriteApi | null;
if(process.env.INFLUX_URL) {
    if(!process.env.INFLUX_ORG || !process.env.INFLUX_BUCKET) {
        log.error("No INFLUX_ORG or INFLUX_BUCKET set")
    } else {
        influx = new InfluxDB({
            url: process.env.INFLUX_URL,
            token: process.env.INFLUX_TOKEN,
            transportOptions: {
                agent: getAgent(process.env.INFLUX_URL, KEEP_ALIVE_OPTIONS),
            },
        })
        log.info({ url: process.env.INFLUX_URL }, 'Influx connected')
        _writer = createWriter()
    }
} else {
    log.warn('not available - no env variables found')
}

export function getGlobalWriter(): WriteApi | null {
    return _writer
}

/** create a new writer instance. MUST be closed manually */
export function createWriter(defaultTags: Record<string, string> = {}): WriteApi | null {
    if(!influx) {
        log.debug('getWriter: influx not available, ignoring')
        return null
    }
    const tags = {
        panel_id: process.env.INFLUX_ID ?? '',
        panel_hostname: hostname(),
        panel_version: pkg.version,
        panel_env: process.env.NODE_ENV ?? 'development',
        panel_ip: process.env.LISTEN_HOST ?? '127.0.0.1',
        panel_port: process.env.LISTEN_PORT ?? "8081",
        ...defaultTags
    }
    log.debug({ defaultTags: tags, flushInterval: FLUSH_INTERVAL }, 'createWriter')
    return influx.getWriteApi(process.env.INFLUX_ORG!, process.env.INFLUX_BUCKET!, "ms", {
        defaultTags: tags,
        /* maximum time in millis to keep points in an unflushed batch, 0 means don't periodically flush */
        flushInterval: FLUSH_INTERVAL,
    })
}
export function sendMetric(metric: string, value: string | number | boolean, labels: Record<string, string> = {}) {
    if(!_writer) return
    const pt = new Point(metric)
    for(const [label, value] of Object.entries(labels)) {
        pt.tag(label, value)
    }
    if(typeof(value) == "number") {
        pt.floatField(metric, value)
    } else {
        pt.stringField(metric, value)
    }
    _writer.writePoint(pt)
    log.debug({ labels, value, measurement: metric }, `writing point`)
}

// uses global writer
export class NamespacedMetric {
    metricPrefix: string;
    globalLabels: Record<string, string> = {}
    constructor(metricPrefix: string, labels: Record<string, string> = {}) {
        this.metricPrefix = metricPrefix
        this.globalLabels = labels
    }

    /** is influxdb available */
    get available() {
        return _writer != null
    }

    label(key: string, value: string) {
        this.globalLabels[key] = value
    }

    /** Attempts to send metric. 'measurement' is added to metricPrefix, metricPrefix_measurement' */
    send(measurement: string, value: string | number | boolean, labels: Record<string, string> = {}): boolean {
        if(!_writer) {
            log.debug('NamespacedMetric.send(): influx not available, ignoring')
            return false
        }
        const pt = new Point(this.metricPrefix)
        const mergedLabels = {
            ...this.globalLabels,
            ...labels
        }
        for(const [label, value] of Object.entries(mergedLabels)) {
            pt.tag(label, value)
        }
        if(typeof(value) == "number") {
            pt.floatField(measurement, value)
        } else {
            pt.stringField(measurement, value)
        }
        _writer.writePoint(pt)
        log.debug({ labels: mergedLabels, measurement, value, prefix: this.metricPrefix }, `NamespacedMetric: writing point`)
        return true
    }

    sendMultiple(measurements: [string, string|number|boolean][], labels: Record<string, string> = {}): boolean {
        if(!_writer) {
            log.debug('NamespacedMetric.send(): influx not available, ignoring')
            return false
        }
        // TODO: possibly use _writer.writePoints
        for(const [measurement, value] of measurements) {
            this.send(measurement, value, labels)
        }
        return true
    }
}