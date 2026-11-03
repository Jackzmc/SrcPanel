import { APIDiscussionCacheableData, APIDiscussionType, type APIComment } from "@srcpanel/common/Discussions";
import type { RowDataPacket } from "mysql2";

export function formatDiscussion(row: RowDataPacket): APIDiscussionCacheableData {
    return {
        id: Number(row.id),
        title: row.title,
        description: row.description,
        type: Number(row.type),
        timestamp: Number(row.timestamp),
        closedAt: row.closed_at ? Number(row.closed_at) : null,
        flags: Number(row.flags),
        creator: {
            id: row.creator,
            name: row.creator_name
        },
        commentsCount: row.comments_count
    }
}

export function formatDiscussionComment(row: RowDataPacket): APIComment {
    return {
        id: Number(row.id),
        timestamp: Number(row.timestamp),
        creator: row.creator ? {
            id: row.creator,
            name: row.creator_name
        } : null,
        content: row.content
    }
}

export function mapDiscussionType(input: string | number): APIDiscussionType {
    if(typeof input === "number") return input as APIDiscussionType
    switch(input) {
        case "radio":
        case "single": 
            return APIDiscussionType.Radio
        case "select":
            return APIDiscussionType.Selection
        case "checkbox":
        case "multiple":
            return APIDiscussionType.Checkbox
        case "short":
            return APIDiscussionType.ShortText
        case "long":
        case "essay":
            return APIDiscussionType.LongText
    }
    throw new Error('Invalid or unknown discussion type')
}