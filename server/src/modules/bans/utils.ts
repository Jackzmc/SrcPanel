import { APIBan, type APIBanAppeal } from "@srcpanel/common/Ban"
import { RowDataPacket } from "mysql2"

/**
 * Format ban object
 * WARN: If executor is from a provider, name will not be fetched.
 */
export function formatBan(ban: RowDataPacket): APIBan {
    const executor = {
        id: ban.executor,
        name: ban.executor_name,
    }
    if(!executor.name && !executor.id.startsWith("STEAM")) {
        const [provider, id] = ban.executor.id.split(":")
        if (provider && id) {
          ban.executor.name = null
          ban.executor.nameResolver = "provider"
          ban.executor.provider = provider
          // Fallback to the id if we don't have the resolved name:
          if (!ban.executor.name) {
            ban.executor.name = id
          }
        }
    }
    return {
        id: ban.id,
        timestamp: parseInt(ban.timestamp),
        ip: ban.ip,
        joinAttempts: parseInt(ban.times_tried),
        flags: parseInt(ban.flags),
        publicReason: ban.public_message,
        reason: ban.reason,
        expired: ban.expired == 1,
        expires: parseInt(ban.expires),
        client: {
            id: ban.steamid,
            name: ban.client_name,
        },
        executor
    }
}

export function formatAppeal(row: RowDataPacket): APIBanAppeal {
    return {
        id: parseInt(row.id),
        state: parseInt(row.state),
        message: row.message,
        ip: row.ip,
        created: parseInt(row.created),
        reject_reason: row.reject_reason,
        rejecter_id: row.rejecter_id
    }
}