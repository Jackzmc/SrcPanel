import type { ToastProps } from "@nuxt/ui";
import type { DownloadEvent, DownloadLogEntry, DownloadProgress } from "@srcpanel/common/Share";

const MAX_LOG_HISTORY = 20

export function useShareWS(shareId: string) {
  const logs = ref<DownloadLogEntry[]>([])
  const items = ref<Map<string, DownloadProgress>>(new Map())

  const toast = useToast()

  let ws: WebSocket

  async function subscribe() {
    ws?.close()
    ws = new WebSocket(`/api/shares/${shareId}/stream`)
    ws.onerror = (event) => {

    }
    ws.onmessage = (wsEvent) => {
        const event = JSON.parse(wsEvent.data) as DownloadEvent
        if(event.type == "log") {
            logs.value.push(event.data)
            if(logs.value.length > MAX_LOG_HISTORY) {
                logs.value.splice(0, logs.value.length - MAX_LOG_HISTORY)
            }
        } else if(event.type == "progress") {
            if(!event.itemId) return
            items.value.set(event.itemId, event.data)
        } else if(event.type == "finish") {
            toast.add({
                color: "success",
                title: "Download queue has finished"
            })   
        }
    }
  }

  onUnmounted(() => ws?.close());

  return { logs, items, subscribe };
}