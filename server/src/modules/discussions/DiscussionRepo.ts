import { APIDiscussionFlags, type APIComment, type APIDiscussionCacheableData, type APIDiscussionOption, type APIDiscussionType, type SubmissionEntry, type UserSubmission } from "@srcpanel/common/Discussions";
import { ADMINS_DB, MAIN_DB, TABLE_PREFIX, type DBClient } from "../../core/database.js";
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { formatDiscussion, formatDiscussionComment } from "./index.js";

export async function getArchivedCount(db: DBClient): Promise<number> {
    const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) count FROM \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussions d
        WHERE d.flags & ${APIDiscussionFlags.Archived} = ${APIDiscussionFlags.Archived}`
    )
    return Number(rows[0].count)
}

export async function getDiscussions(db: DBClient, archived = false): Promise<APIDiscussionCacheableData[]> {
    const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT 
            d.id,
            d.title,
            d.description,
            d.type,
            d.timestamp,
            d.closed_at,
            d.flags,
            d.creator, 
            u.last_name as creator_name, 
            (
                SELECT COUNT(*) FROM \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussion_comments WHERE discussion_id = d.id
            ) as comments_count 
        FROM \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussions d 
        LEFT JOIN \`${MAIN_DB}\`.view_${TABLE_PREFIX}_user u ON SUBSTRING(d.creator, 11) = u.account_id 
        WHERE d.flags & ${APIDiscussionFlags.Archived} = ${archived ? APIDiscussionFlags.Archived : 0} 
        ORDER BY d.timestamp DESC`
    )
    return rows.map(formatDiscussion)
}

export async function getDiscussion(db: DBClient, id: number): Promise<APIDiscussionCacheableData | null> {
    const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT 
            d.id,
            d.title,
            d.description,
            d.type,
            d.timestamp,
            d.closed_at,
            d.flags,
            d.creator, 
            u.last_name as creator_name, 
            (
                SELECT COUNT(*) FROM \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussion_comments WHERE discussion_id = d.id
            ) as comments_count 
        FROM \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussions d 
        LEFT JOIN \`${MAIN_DB}\`.view_${TABLE_PREFIX}_user u ON SUBSTRING(d.creator, 11) = u.account_id 
        WHERE d.flags & ${APIDiscussionFlags.Archived} = 0 AND d.id = ?
        ORDER BY d.timestamp DESC`,
        [ id ]
    )

    return rows.length > 0 ? formatDiscussion(rows[0]) : null
}

export async function getSubmissions(db: DBClient, discussionId: number): Promise<SubmissionEntry[]> {
    const [responses] = await db.execute<RowDataPacket[]>(`
        SELECT 
            res.steamid, 
            u.last_name as name,
            res.text, 
            res.choice, 
            opt.label
        FROM \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussion_responses res 
        LEFT JOIN \`${MAIN_DB}\`.view_${TABLE_PREFIX}_user u ON SUBSTRING(res.steamid, 11) = u.account_id 
        LEFT JOIN \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussion_options opt ON opt.id = res.choice 
        WHERE res.discussion_id = ?`, 
        [ discussionId ]
    )
    return responses.map(row => {
        return {
            user: {
                id: row.steamid,
                name: row.name
            },
            text: row.text,
            choice: row.choice && {
                id: row.choice,
                label: row.label
            } || undefined
        }
    })
}

export async function getUserSubmissions(db: DBClient, discussionId: number, userSteamid: string): Promise<UserSubmission[]> {
    const [responses] = await db.execute<RowDataPacket[]>(`
        SELECT 
            res.text, 
            res.choice, 
            opt.label
        FROM \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussion_responses res 
        LEFT JOIN \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussion_options opt ON opt.id = res.choice 
        WHERE res.discussion_id = ? AND SUBSTRING(res.steamid, 11) = SUBSTRING(?, 11)`, 
        [ discussionId, userSteamid ]
    )
    return responses.map(row => {
        return {
            text: row.text,
            choice: row.choice && {
                id: row.choice,
                label: row.label
            } || undefined
        }
    })
}

export async function getOptions(db: DBClient, discussionId: number): Promise<APIDiscussionOption[]> {
    const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT * FROM ${ADMINS_DB}.${TABLE_PREFIX}_discussion_options 
        WHERE discussion_id = ?`, 
        [ discussionId ]
    )
    return rows.map(o => ({ id: o.id, label: o.label }))
}

export async function setDiscussionFlags(db: DBClient, discussionId: number, flags: number) {
    await db.execute(`
        UPDATE ${ADMINS_DB}.${TABLE_PREFIX}_discussions 
        SET flags = ?
        WHERE id = ?`, 
        [flags, discussionId]
    )
}

export async function clearAnswers(db: DBClient, discussionId: number, userSteamid: string) {
     await db.execute(`
        DELETE FROM ${ADMINS_DB}.${TABLE_PREFIX}_discussion_responses 
        WHERE discussion_id = ? 
            AND steamid = ?`, 
        [discussionId, userSteamid]
    )
}

export async function insertAnswerText(db: DBClient, discussionId: number, userSteamid: string, text: string) {
    await db.execute(`
        INSERT INTO ${ADMINS_DB}.${TABLE_PREFIX}_discussion_responses 
        (discussion_id, steamid, text) 
        VALUES (?, ?, ?)`, 
        [discussionId, userSteamid, text]
    )
}

export async function insertAnswerChoice(db: DBClient, discussionId: number, userSteamid: string, optionId: number) {
    await db.execute(`
        INSERT INTO ${ADMINS_DB}.${TABLE_PREFIX}_discussion_responses 
        (discussion_id, steamid, choice) 
        VALUES (?, ?, ?)`, 
        [discussionId, userSteamid, optionId]
    )
}

export async function updateDiscussion(db: DBClient, discussionId: number, title: string, description: string | null, closedAt: number | null, type: APIDiscussionType, flags: number) {
    await db.query<ResultSetHeader>(
        `UPDATE ${ADMINS_DB}.${TABLE_PREFIX}_discussions 
        SET title = ?, description = ?, closed_at = ?, type = ?, flags = ? 
        WHERE id = ?`,
        [ title, description, closedAt, type, flags, discussionId ]
    )
}

export async function createDiscussion(db: DBClient, creatorSteamId: string, title: string, description: string | null, closedAt: number | null, type: APIDiscussionType, flags: number = 0): Promise<number> {
    const [r] = await db.query<ResultSetHeader>(`
        INSERT INTO ${ADMINS_DB}.${TABLE_PREFIX}_discussions 
        (title, description, creator, closed_at, type, flags) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [ title, description, creatorSteamId, closedAt, type, flags ]
    )
    return r.insertId
}

export async function clearOptions(db: DBClient, discussionId: Number) {
    await db.query<ResultSetHeader>(
        `DELETE FROM ${ADMINS_DB}.${TABLE_PREFIX}_discussion_options
        WHERE discussion_id = ?`,
        [ discussionId ]
    )

}

export async function insertOption(db: DBClient, discussionId: number, label: string): Promise<number> {
    const [r] = await db.query<ResultSetHeader>(`
        INSERT INTO ${ADMINS_DB}.${TABLE_PREFIX}_discussion_options 
        (discussion_id, label)
        VALUES (?, ?)`,
        [ discussionId, label ]
    )
    return r.insertId
}

export async function getComments(db: DBClient, discussionId: number, withCreator = true): Promise<APIComment[]> {
    const selectName = withCreator
        ? `, com.creator, u.last_name as creator_name`
        : ''
    const joinStatement = withCreator 
        ? ` LEFT JOIN ${MAIN_DB}.view_${TABLE_PREFIX}_user u ON SUBSTRING(com.creator, 11) = u.account_id`
        : ''
    const [rows] = await db.execute<RowDataPacket[]>(`
      SELECT com.id, com.timestamp, com.content${selectName}
      FROM ${ADMINS_DB}.${TABLE_PREFIX}_discussion_comments com
      ${joinStatement}
      WHERE com.discussion_id = ? `, 
      [ discussionId ]
    )
    return rows.map(formatDiscussionComment)
}

export async function insertComment(db: DBClient, discussionId: number, creatorSteamId: string, content: string): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO ${ADMINS_DB}.${TABLE_PREFIX}_discussion_comments 
        (discussion_id, creator, content, timestamp) 
      VALUES 
        (?, ?, ?, UNIX_TIMESTAMP())`,
      [discussionId, creatorSteamId, content]
    )
    return result.insertId
}


// export async function addOrUpdateChoice(db: DBClient, discussionId: number, label: string) {
//     await db.query<ResultSetHeader>(`
//         INSERT INTO ${ADMINS_DB}.${TABLE_PREFIX}_discussion_options 
//         (discussion_id, label)
//         VALUES (?, ?) 
//         ON DUPLICATE KEY UPDATE `
//     )

// }