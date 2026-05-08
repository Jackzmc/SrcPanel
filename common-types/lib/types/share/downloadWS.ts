export interface DownloadMessage_Error {
  error?: string
  code: string,
  message: string,
  filename?: string
}

export interface DownloadMessage_EntryError {
  state: "DOWNLOADING",
  error?: boolean,
  entry: string,
  entryTitle?: string,
  message: string,
}

export interface DownloadMessage_EntryStart {
  state: "DOWNLOADING",
  entry: string,
  entryTitle?: string,
  currentBytes: number,
  totalBytes: number,
  progress: number,
  message: string,
}

export interface DownloadMessage_EntryProgress {
  state: "DOWNLOAD_PROGRESS" | "DOWNLOADED",
  entry: string,
  currentBytes: number,
  totalBytes: number,
  progress: number,
  message?: string
}

export interface DownloadMessage_Complete {
  state: "COMPLETE"
}

export type APIDownloadAddonsMessage = DownloadMessage_Error | DownloadMessage_EntryError
  | DownloadMessage_EntryStart | DownloadMessage_EntryProgress
  | DownloadMessage_Complete;
