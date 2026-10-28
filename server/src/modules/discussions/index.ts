import { APIDiscussionCacheableData } from "@srcpanel/common/Discussions";

export function formatDiscussion(row: any, options: any[], commentCount = 0): APIDiscussionCacheableData {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        timestamp: parseInt(row.timestamp),
        creator: {
            id: row.creator,
            name: row.creator_name,
        },
        closedAt: parseInt(row.closedAt) ?? 0,
        type: parseInt(row.type),
        flags: parseInt(row.flags),
        options: options.map(o => ({ id: o.id, label: o.label })),
        commentsCount: commentCount,
    }
}