import type { ToastProps } from "@nuxt/ui";
import type { AddonInfo, DownloadEvent, DownloadLogEntry, DownloadProgress, ScanEvent, WebsocketMessage, WebsocketRequest } from "@srcpanel/common/Share";

const MAX_LOG_HISTORY = 20
const RECONNECT_INTERVAL_MS = 1000 * 5

export function useShareWS() {
  const logs = ref<DownloadLogEntry[]>([])
  const items = ref<Map<string, DownloadProgress>>(new Map())
  let addons = ref<AddonInfo[]>()

  const toast = useToast()

  let ws: WebSocket

  function sendRequest(msg: WebsocketRequest) {
    
    ws.send(JSON.stringify(msg))
  }

  function setup() {
    if (import.meta.server) return
    // swap http(s)://example -> ws(s)://example
    const host = useRuntimeConfig().public.apiAuthUrl.replace('http', 'ws')
    ws?.close()
    ws = new WebSocket(`${host}/api/shares/event-stream`)
    ws.onerror = (event) => {
      console.warn("websocket error: ", event)
    }
    ws.addEventListener("close", (event) => {
      console.warn("Share event stream socket ended, reconnecting")
      setTimeout(() => setup(), RECONNECT_INTERVAL_MS)
    })
    ws.addEventListener("message", (wsEvent) => {
        const msg = JSON.parse(wsEvent.data) as WebsocketMessage
        if(msg.type === "event") {
          if(msg.event.type == "log") {
            logs.value.push(msg.event.data)
            if(logs.value.length > MAX_LOG_HISTORY) {
                logs.value.splice(0, logs.value.length - MAX_LOG_HISTORY)
            }
          } else if(msg.event.type == "progress") {
            if(!msg.event.itemId) return
            items.value.set(msg.event.itemId, msg.event.data)
          } else if(msg.event.type == "finish") {
            toast.add({
                color: "success",
                title: "Download queue has finished"
            })   
          }
        } else if(msg.type === "error") {
          console.warn("websocket error msg: ", msg)
        } else if(msg.type === "ok") {
          console.debug("websocket OK")
        } else if(msg.type === "scan") {
          if(addons.value) {
            mergeAddons(msg.event)
          }
        }
    })
  }

  async function subscribe(shareId: string, addons?: Ref<AddonInfo[]>) {
    if (import.meta.server) return
    if(!ws || ws.readyState == ws.CLOSED) setup()
    // Wait until it's open before subscribing
    if(ws.readyState == ws.OPEN) {
      sendRequest({ subscribe: shareId })
    } else {
      ws.addEventListener("open", () => sendRequest({ subscribe: shareId }))
    }
  }

  function mergeAddons(event: ScanEvent) {
    if(!addons.value) return
    for(let i = 0; i < addons.value.length; i++) {
      const addon = addons.value[i]!
      // Remove the removed
      if(event.removed.includes(addon.filename)) {
        addons.value.splice(i, 1)
      } else if(event.changed[addon.filename]) {
        addons.value[i] = event.changed[addon.filename]!
      }
    }
    // Add all new ones
    addons.value.push(...event.added)
  }

  async function unsubscribe() {
    ws?.close()
  }

  onUnmounted(() => ws?.close());

  return { logs, items, subscribe, unsubscribe };
}