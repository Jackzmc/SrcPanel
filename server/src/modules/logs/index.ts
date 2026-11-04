import type { LogEntry } from "@srcpanel/common/Logs"
import PlayerManager from "../users/PlayerManager.js"
import SteamID from "steamid"

const ADMIN_CHAT_REGEX = new RegExp(/triggered (sm_say|sm_chat) \(text (.*)\)/)

export function formatLogEntry(log: any): LogEntry {
    if (log.metadata) log.metadata = JSON.parse(log.metadata)
    // If its a valid user but no name, then put it in a list to be updated:
    if (!log.clientName && log.client?.startsWith("STEAM_")) {
        PlayerManager.instance.enqueueNameResolve(new SteamID(log.client))
    }
    if (!log.targetName && log.target?.startsWith("STEAM_")) {
        PlayerManager.instance.enqueueNameResolve(new SteamID(log.target))
    }
    // Admin chats are performed via sm_say / sm_chat commands
    // So we detect that, grab the message and mark it as actually 'CHAT'
    if (log.type == 'ACTION') {
        const match = log.message.match(ADMIN_CHAT_REGEX)
        if (match) {
            log.type = 'CHAT'
            // Kindaaa messy, but we do want to keep the raw message
            log.metadata = {
                admin_chat: true,
                command: match[1],
                text: match[2]
            }
        }
    }
    return log as LogEntry
}