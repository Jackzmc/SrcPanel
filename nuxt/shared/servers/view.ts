export function createConnection(serverId: string) {
  const protocol = window.location.protocol == "http:" ? "ws" : "wss"
  const url = `${protocol}://${window.location.host}/api/servers/${serverId}/ws`
  console.debug('connecting to', url)
  const ws = new WebSocket(url)

  ws.onmessage = onMessage
  ws.onerror = onError
}

async function onMessage(this: WebSocket, event: MessageEvent<string>) {
  const json = JSON.parse(event.data)
  console.debug('json', json)
}

function onError(this: WebSocket, event: Event) {

}
