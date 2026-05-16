import { InfluxDB, Point, WriteApi } from "@influxdata/influxdb-client";
import dotenv from 'dotenv'
import pkg from '../../../package.json' with { type: "json" }
import logger from '../../logger.js'
const log = logger.child({ name: "influx" })
dotenv.config()

const FLUSH_INTERVAL = process.env.INFLUX_FLUSH_INTERVAL_MS ? parseInt(process.env.INFLUX_FLUSH_INTERVAL_MS) : 30_000
const BATCH_SIZE = 30 // we don't write points often
const NAMESPACE = process.env.INFLUX_NAMESPACEs ?? "panel"

import { Agent as httpAgent } from 'http'
import { AgentOptions, Agent as httpsAgent } from 'https'

const KEEP_ALIVE_OPTIONS: AgentOptions = {
  keepAlive: true, // reuse existing connections
  keepAliveMsecs: 20 * 1000, // 20 seconds keep alive
}

import { hostname } from "os";

function getAgent(url: string, options: AgentOptions) {
    if(url.startsWith("https"))
        return new httpsAgent(options)
    else if(url.startsWith("http"))
        return new httpAgent(options)
    throw new Error("invalid protocol")
}

let influx: InfluxDB;
let _writer: WriteApi | null;
if(process.env.INFLUX_URL) {
    if(!process.env.INFLUX_ORG || !process.env.INFLUX_BUCKET) {
        log.error("No INFLUX_ORG or INFLUX_BUCKET set")
    } else {
        const proxyUrl =
            process.env.HTTP_PROXY ||
            process.env.http_proxy

        const agent = getAgent(process.env.INFLUX_URL, KEEP_ALIVE_OPTIONS)
        agent.on("response", (err) => {
            log.error({}, "agent res" + err)
        })
        agent.on("close", () => {
            log.debug({}, "agent close early")
        })
        agent.on("error", (e) => console.log('e?', e))
        influx = new InfluxDB({
            url: process.env.INFLUX_URL,
            token: process.env.INFLUX_TOKEN,
            proxyUrl,
            transportOptions: {
                redirect: 'error',
                timeout: 10_000,
                agent,
            },
        })
        log.info({ url: process.env.INFLUX_URL, proxy: proxyUrl }, 'Influx connected')
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
    log.debug({ defaultTags: tags, flushInterval: FLUSH_INTERVAL, batchSize: BATCH_SIZE }, 'createWriter')
    return influx.getWriteApi(process.env.INFLUX_ORG!, process.env.INFLUX_BUCKET!, "ms", {
        batchSize: BATCH_SIZE,

        defaultTags: tags,
        /* maximum time in millis to keep points in an unflushed batch, 0 means don't periodically flush */
        flushInterval: FLUSH_INTERVAL,
    })
}
type MetricLabels = Record<string, string|boolean|number|undefined>
export function sendMetric(field: string, value: number, labels: MetricLabels = {}) {
    if(!_writer) return
    const pt = new Point(NAMESPACE)
    writeTags(pt, labels)
    if(typeof(value) == "number") {
        pt.floatField(field, value)
    } else {
        pt.stringField(field, value)
    }
    _writer.writePoint(pt)
    log.trace({ labels, value, measurement: `${NAMESPACE}_${field}` }, `writing point`)
}

function writeTags(point: Point, labels: MetricLabels) {
    for(const [label, value] of Object.entries(labels)) {
        if(value == undefined) continue
        // Record booleans as "1"/"0" rather than "true"/"false"
        if(typeof value === "boolean") point.tag(label, value ? "1" : "0")
        else point.tag(label, value.toString())
    }
}

/**
 * Allows sending metrics with a prefix, such as panel_%PREFIX%_%METRIC%
 * Labels are always written as tags/strings, booleans converted to 1/0
 * Metrics written as float 
 * Uses global writer
 */
export class NamespacedMetric {
    metricPrefix: string;
    globalLabels: Record<string, string> = {}
    /**
     * 
     * @param metricPrefix the prefix/type of metric, eventually becomes panel_%PREFIX%_%METRIC%
     * @param labels any additional labels that are merged with individual ones. booleans converted to 1/0
     */
    constructor(metricPrefix: string, labels: Record<string, string> = {}) {
        this.metricPrefix = `panel_${metricPrefix}`
        this.globalLabels = labels
    }

    /**
     * Is influxDB configured and available?
     */
    get available() {
        return _writer != null
    }

    /**
     * Add/set a global label to value
     * @param key
     * @param value 
     */
    label(key: string, value: string) {
        this.globalLabels[key] = value
    }

    /**
     * Send metric. 
     * @param measurement name of measurement to append
     * @param value string values are dropped in victoriametrics
     * @param labels any labels to send
     * @returns true if sent, false if influx not available
     */
    send(measurement: string, value: string | number | boolean, labels: MetricLabels = {}): boolean {
        if(!_writer) {
            log.debug('NamespacedMetric.send(): influx not available, ignoring')
            return false
        }
        const pt = new Point(this.metricPrefix)
        const mergedLabels = {
            ...this.globalLabels,
            ...labels
        }
        writeTags(pt, mergedLabels)
        if(typeof value === "boolean") pt.booleanField(measurement, value ? "1" : "0")
        else if(typeof(value) == "number") pt.floatField(measurement, value)
        _writer.writePoint(pt)
        log.trace({ labels: mergedLabels, measurement, value, prefix: this.metricPrefix }, `NamespacedMetric: writing point`)
        return true
    }

    /**
     * Send multiple metrics at once
     * @param measurements and array of [key, value] arrays
     * @param labels any labels to send
     * @returns true if sent, false if influx not available
     */
    sendMultiple(measurements: [string, number][], labels: MetricLabels = {}): boolean {
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