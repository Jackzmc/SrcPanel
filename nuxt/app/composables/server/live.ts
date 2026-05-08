import type { ComputeStats, ServerDetailed, ServerStatus, VoiceUser } from '@jzpanel/common/Server';
import type { ClientOutPayload, ServerOutPacket } from '../../../../common-types/ServerWebsocket.js';
import { ref } from 'vue'
import type { UnwrapRef } from 'vue'
import { updateLiveCache, type Annotation, type LiveDataCache } from '@jzpanel/common/Live';
import type { LogEntry } from '@jzpanel/common/Logs';

const MAX_BACKOFF_MS = 1000 * 60 * 2
const MAX_AUDIT_LOG_ENTRIES = 20
const MAX_METRIC_HISTORY = 100

export type WebsocketStatus = 'connecting' | 'connected' | 'disconnected'

export type WebsocketExport = ReturnType<typeof useServerWebsocket>
export type WebsocketExportProp = UnwrapRef<WebsocketExport>

export function useServerWebsocket(data: ServerDetailed) {
  const wsStatus = ref<WebsocketStatus>('disconnected')
  const serverStatus = ref<ServerStatus | null>(data.server.status)
  const serverState = ref<boolean>(data.server.online)
  const logs = ref<string[]>([])
  const voiceMembers = ref<VoiceUser[] | null>(data.voiceMembers ?? null)
  const metrics = ref<MetricData>({ stats: [], annotations: { xaxis: [], yaxis: [] } })
  const live = ref<LiveDataCache | null>(data.live)

  const playerCount = computed(() => {
    if(live.value) return Object.values(live.value.clients)
        .filter(client => client.steamid != 'BOT')
        .length
    if(serverStatus.value) return serverStatus.value.data?.players.length
    return null
  })

  let socket: WebSocket | null = null;
  let reconnectTimeout: any = undefined;
  let errCount = 0;

  const prefix = `[Live/${data.server.id}]`
  const config = useRuntimeConfig()

  function connect() {
    wsStatus.value = 'connecting'
    console.log('env', import.meta.env.NUXT_PUBLIC_API_PUBLIC_URL)
    let urlPrefix = `${window.location.protocol}//${window.location.host}`
    if (import.meta.dev && config.public.apiPublicUrl) {
      urlPrefix = config.public.apiPublicUrl
    }
    const url = `${urlPrefix.replace('http', 'ws')}/api/servers/${data.server.id}/ws`
    console.debug(prefix, 'connecting to', url)
    const ws = new WebSocket(url)

    ws.onopen = () => {
      console.debug(prefix, 'connected', ws)
      wsStatus.value = 'connected'
      errCount = 0
      clearTimeout(reconnectTimeout)

      if (logs.value.length == 0) {
        send({ type: "req_logs" })
      }
    }
    ws.onclose = (event) => {
      if (event.code == 100) return
      // Custom error for server to terminate our side
      if (event.code == 4000) throw new Error(`Fatal error: ${event.reason}`)

      wsStatus.value = 'disconnected'
      errCount++
      const retryTime = Math.min(1000 * (Math.pow(1.5, errCount) + 3), MAX_BACKOFF_MS)
      console.warn(prefix, "disconnected; reconnecting in", retryTime / 1000, "s", { errCount, reason: event.reason, code: event.code })
      reconnectTimeout = setTimeout(() => {
        connect()
      }, retryTime)
    }
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data)
      console.debug(prefix, "payload", payload)
      onPayload(payload)
    }
    ws.onerror = (event) => {
      console.error(prefix, 'error', event)
    }

    socket = ws
  }

  async function onPayload(payload: ServerOutPacket) {
    switch (payload.type) {
      case "log":
        logs.value.push(payload.content)
        break
      case "metric_full":
        metrics.value.stats = payload.history
        metrics.value.annotations = payload.annotations
        break
      case "metric":
        metrics.value.stats.push(payload.metric)
        if (metrics.value.stats.length > MAX_METRIC_HISTORY) {
          metrics.value.stats.splice(0, metrics.value.stats.length - MAX_METRIC_HISTORY)
        }
        break
      case "error":
        console.error(prefix, "error", payload.error, payload.message)
        break
      case "status":
        serverStatus.value = payload.status
        serverState.value = payload.online
        break
      case "live":
        live.value = updateLiveCache(live.value, payload.record)
        break
      case "audit_log":
        // auditLogs.value.push(payload.)
        // if(auditLogs.value.length > MAX_AUDIT_LOG_ENTRIES) {
        //   auditLogs.value.splice(0, auditLogs.value.length - MAX_AUDIT_LOG_ENTRIES)
        // }
        // No implementation on server. Possibly just indication of refresh
        break
      case "voice_state":
        // voiceMembers undefined if no voice configured,
        // so we *shouldn't* receive anything, but just incase, assume its supported:
        if (!voiceMembers.value) voiceMembers.value = []

        // Remove or add user to list
        const index = voiceMembers.value.findIndex(m => m.id == payload.userId)
        if (payload.connected) {
          if (index == -1) {
            voiceMembers.value.push({ id: payload.userId, name: payload.userName })
          }
        } else if (index > -1) {
          voiceMembers.value.splice(index, 1)
        }
        break
      default:
        console.warn(prefix, "unknown payload type", payload)
    }
  }

  function disconnect() {
    socket?.close()
    socket = null
    clearTimeout(reconnectTimeout)
  }

  function send(payload: ClientOutPayload) {
    socket?.send(JSON.stringify(payload))
  }

  // Clean up when the component using this is unmounted
  onUnmounted(() => disconnect())

  return {
    // REFS
    logs,
    wsStatus,
    serverStatus,
    serverState,
    metrics,
    voiceMembers,
    live,
    // COMPUTED
    playerCount,
    // METHODS
    connect, 
    disconnect, 
    send
  }
}

export interface MetricData {
  stats: ComputeStats[],
  annotations: Annotation
}
