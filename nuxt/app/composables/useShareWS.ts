import type { ToastProps } from "@nuxt/ui";
import type { DownloadEvent, DownloadLogEntry, DownloadProgress, WebsocketMessage, WebsocketRequest } from "@srcpanel/common/Share";

const MAX_LOG_HISTORY = 20

export function useShareWS() {
  const logs = ref<DownloadLogEntry[]>([])
  const items = ref<Map<string, DownloadProgress>>(new Map())

  const toast = useToast()

  let ws: WebSocket

  function sendRequest(msg: WebsocketRequest) {
    ws.send(JSON.stringify(msg))
  }

  function setup() {
    ws?.close()
    ws = new WebSocket(`/api/shares/event-stream`)
    ws.onerror = (event) => {
      console.warn("websocket error: ", event)
    }
    ws.onmessage = (wsEvent) => {
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
        }
    }
  }

  async function subscribe(shareId: string) {
    if(!ws) setup()
    sendRequest({ subscribe: shareId })
  }

  async function unsubscribe() {
    ws?.close()
  }

  onUnmounted(() => ws?.close());

  return { logs, items, subscribe, unsubscribe };
}