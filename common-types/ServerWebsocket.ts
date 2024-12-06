import { Annotation, LiveRecord } from './Live.js';
import { ComputeStats, ServerStatus } from './Server';

////////////////////////
// CLIENT -> Server
////////////////////////
export interface Client_Command {
    type: "action",
    namespace?: string,
    command: string,
}
export type ClientOutPayload = Client_Command


////////////////////////
// SERVER -> Client
////////////////////////
export interface Server_Metric {
    type: "metric",
    metric: ComputeStats,
}
export interface Server_MetricFull {
    type: "metric_full",
    timestamp: number,
    latest: ComputeStats,
    history: ComputeStats[],
    annotations: Annotation
}
export interface Server_Live {
    type: "live",
    record: LiveRecord
}
export interface Server_Status {
    type: "status",
    online: boolean,
    status: ServerStatus
}
export interface Server_LogEntry {
    type: "log",
    timestamp: number,
    content: string
}
export interface Server_ActivityLog {
    type: "audit_log",
    // TODO:
}
export interface Server_Error {
    type: "error",
    error?: string,
    code?: string
}

export type ServerOutPayload = Server_Metric | Server_MetricFull | Server_Live | Server_Status | Server_LogEntry | Server_ActivityLog | Server_Error
export type ServerOutPacket = ServerOutPayload & {
    type: string,
    millis: number
}