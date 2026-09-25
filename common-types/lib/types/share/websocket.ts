import { DownloadEvent } from "../Share.js"

export interface WebsocketError {
  type: "error",
  error: string,
  message?: string
}

export interface WebsocketOK { type: "ok" }

export interface WebsocketDownloadEvent {
  type: "event",
  event: DownloadEvent
}

/**
 * Represents a message from the socket, either meta (socket error, ack) or data (event)
 */
export type WebsocketMessage = WebsocketError | WebsocketOK | WebsocketDownloadEvent

/**
 * Requests to subscribe to a share's download queue
 */
export interface WebsocketSubscribe {
    /**
     * The ID of the share
     */
    subscribe: string
}

export type WebsocketRequest = WebsocketSubscribe