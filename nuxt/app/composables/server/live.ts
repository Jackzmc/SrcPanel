import type { ServerDetailed, VoiceUser } from '@common/Server.js';
import type { ClientOutPayload, ServerOutPacket } from '../../../../common-types/ServerWebsocket.js';

const MAX_BACKOFF_MS = 1000 * 60 * 2

export type LiveServerStatus = 'connecting' | 'connected' | 'disconnected'

export type LiveExport = ReturnType<typeof useServerWebsocket>

export function useServerWebsocket(data: ServerDetailed) {
  const status = ref<LiveServerStatus>('disconnected')
  const logs = ref<string[]>([])
  const voiceMembers = ref<VoiceUser[] | null>(data.voiceMembers ?? null)

  let socket: WebSocket | null = null;
  let reconnectTimeout: any = undefined;
  let errCount = 0;

  const prefix = `[Live/${data.server.id}]`
  const config = useRuntimeConfig()

  function connect() {
    status.value = 'connecting'
    // TODO: can't connect via nuxt server
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
      status.value = 'connected'
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

      status.value = 'disconnected'
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

  return { logs, status, connect, disconnect, send }
}
