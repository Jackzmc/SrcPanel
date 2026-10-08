import PromClient, { Counter, Gauge } from '@platformatic/prom-client'
import FastifyMetrics from 'fastify-metrics'
import { FastifyInstance } from 'fastify';
import { exec } from 'node:child_process';
import Logger from '../logger.js'

const log = Logger.child({ name: "Core/PromMetrics" })

let _version: string

export const METRIC_AUTH_LOGIN_COUNT = new Gauge({
  name: "panel_auth_login_count",
  help: "number of times any user has logged in",
  labelNames: ["source"]
})

export const METRIC_SERVERS_LIVE_VIEWERS = new Gauge({
  name: "panel_servers_ws_viewers",
  help: "number of viewers of Live view",
  labelNames: ["server_id"]
})

export const METRIC_SERVERS_STATUS_STATE = new Gauge({
  name: "panel_servers_status_state",
  help: "state of gamedig status result",
  labelNames: ["server_id", "type"]
})

export const METRIC_SERVERS_STATUS_PLAYERS = new Gauge({
  name: "panel_servers_status_players",
  help: "number of players detected on server",
  labelNames: ["server_id", "type"]
})

export const METRIC_SERVERS_LIVE_AUTH_COUNT = new Counter({
  name: "panel_servers_live_auth_count",
  help: "number of times servers have authenticated with panel live server",
  labelNames: ["appid", "game_version"]
})

export const METRIC_SHARE_DOWNLOAD_COUNT = new Gauge({
  name: "panel_share_downloads",
  help: "number of items downloaded",
  labelNames: ["share_id", "source"]
})

export const METRIC_SHARE_SCAN_COUNT = new Gauge({
  name: "panel_share_scanned",
  help: "number of items scanned",
  labelNames: ["share_id", "steam_workshop"]
})

export const METRIC_STARTUP_TIME = new Gauge({
    name: "panel_startup_time",
    help: "startup time in ms of panel until fastify ready"
})

export async function register() {
    await getVersion()
        .then(v => _version = v)
        .catch(err => log.warn({err}, "could not get version"))

    PromClient.register.registerMetric(METRIC_SERVERS_LIVE_VIEWERS)
    PromClient.register.setDefaultLabels(getLabels())
}

export async function registerPlugin(fastify: FastifyInstance) {
    await fastify.register(FastifyMetrics.default, { 
        endpoint: '/api/metrics', 
        promClient: PromClient,
    })
}

export function getLabels() {
    return {
        panel_id: process.env.INFLUX_ID ?? '',
        panel_version: _version,
        panel_env: process.env.NODE_ENV ?? 'development',
        panel_ip: process.env.LISTEN_HOST ?? '127.0.0.1',
        panel_port: process.env.LISTEN_PORT && parseInt(process.env.LISTEN_PORT) || 8081,
    }
}

export async function getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
        if(process.env.GIT_BRANCH) return resolve(process.env.GIT_BRANCH)
        exec("git rev-parse --abbrev-ref HEAD", (err, output) => {
            if(err) return reject(err)
            resolve(output.trim())
        })
    })
}