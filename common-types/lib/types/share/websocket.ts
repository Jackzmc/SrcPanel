import { AddonInfo, DownloadEvent } from "../Share.js"

export interface ScanEvent {
  added: AddonInfo[],
  changed: Record<string, AddonInfo>,
  /** List of filenames that have been removed */
  removed: string[]
}


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

export interface WebsocketScan {
  type: "scan",
  event: ScanEvent
}

/**
 * Represents a message from the socket, either meta (socket error, ack) or data (event)
 */
export type WebsocketMessage = WebsocketError | WebsocketOK | WebsocketDownloadEvent | WebsocketScan

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