import type { APIDiscussionType } from "@srcpanel/common/Discussions";
import { ADMINS_DB, TABLE_PREFIX, type DBClient } from "../../core/database.js";
import type { ResultSetHeader } from 'mysql2/promise'

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

export async function insertAnswerChoice(db: DBClient, discussionId: number, userSteamid: string, optionId: string) {
    await db.execute(`
        INSERT INTO ${ADMINS_DB}.${TABLE_PREFIX}_discussion_responses 
        (discussion_id, steamid, choice) 
        VALUES (?, ?, ?)`, 
        [discussionId, userSteamid, optionId]
    )
}

export async function updateDiscussion(db: DBClient, discussionId: number, title: string, description: string | null, closedAt: number, type: APIDiscussionType, flags: number) {
    await db.query<ResultSetHeader>(
        `UPDATE ${ADMINS_DB}.${TABLE_PREFIX}_discussions 
        SET title = ?, description = ?, closed_at = ?, type = ?, flags = ? 
        WHERE id = ?`,
        [ title, description, closedAt, type, flags, discussionId ]
    )
}

export async function clearOptions(db: DBClient, discussionId: Number) {
    await db.query<ResultSetHeader>(
        `DELETE FROM ${ADMINS_DB}.${TABLE_PREFIX}_discussion_options
        WHERE discussion_id = ?`,
        [ discussionId ]
    )

}

export async function insertOption(db: DBClient, discussionId: number, label: string) {
    await db.query<ResultSetHeader>(`
        INSERT INTO ${ADMINS_DB}.${TABLE_PREFIX}_discussion_options 
        (discussion_id, label)
        VALUES (?, ?)`,
        [ discussionId, label ]
    )

}

// export async function addOrUpdateChoice(db: DBClient, discussionId: number, label: string) {
//     await db.query<ResultSetHeader>(`
//         INSERT INTO ${ADMINS_DB}.${TABLE_PREFIX}_discussion_options 
//         (discussion_id, label)
//         VALUES (?, ?) 
//         ON DUPLICATE KEY UPDATE `
//     )

// }