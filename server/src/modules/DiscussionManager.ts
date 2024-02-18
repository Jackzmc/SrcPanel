import { APICountData, APIDiscussionCacheableData, APIDiscussionFlags, APIResponsesData } from "../../../common-types/Discussions.js";
import ConfigManager from "./ConfigManager.js";
import { Pool, RowDataPacket } from 'mysql2/promise';
import User from "./users/User.js";
import AuthManager from "./auth/AuthManager.js";

const AUTO_ARCHIVE_TIME = 1000 * 60 * 60 * 24 * 10 // 10 days

export default class DiscussionManager {
    #db: Pool
    #config: ConfigManager
    #authmngr: AuthManager

    #discussions = new Map<number, APIDiscussionCacheableData>()

    constructor(db: Pool, config: ConfigManager, authManager: AuthManager) {
        this.#db = db
        this.#config = config
        this.#authmngr = authManager
    }

    get(id: number) {
        return this.#discussions.get(id)
    }

    getAll() {
        return this.#discussions.values()
    }

    set(id: number, discussion: APIDiscussionCacheableData) {
        this.#discussions.set(id, discussion)
    }

    async getUnrespondedCount(steamid2: string) {
        // Returns the number of non-archived, non-closed discussions user has responded to
        const [rows] = await this.#db.execute<RowDataPacket[]>(
            `SELECT discussion_id FROM \`left4dead2-admins\`.dash_discussion_responses r JOIN \`left4dead2-admins\`.dash_discussions d ON d.id = r.discussion_id WHERE steamid = ? AND d.flags & ${APIDiscussionFlags.Archived} = 0 AND UNIX_TIMESTAMP() < d.closed_at GROUP BY r.discussion_id`, [steamid2])
        
        const totalOpenDiscussions = [...this.#discussions.values()].filter((d) => !d.closedAt || Date.now() < (d.closedAt*1000)).length
        return totalOpenDiscussions - rows.length
    }

    async getResponses(id: number, user: User, includeUsers: boolean): Promise<{ responses: APIResponsesData, userSelection: number[] }> {
        const totalUsers = this.#authmngr.AdminCount
        const domain = await this.#config.GetKV("domain");
        const [responses] = await this.#db.execute<RowDataPacket[]>(
            "SELECT res.steamid, res.choice, u.last_alias as name FROM `left4dead2-admins`.dash_discussion_responses res LEFT JOIN `left4dead2`.stats_users u ON res.steamid = u.steamid WHERE res.discussion_id = ?", [id]
        )
        const counts: Record<string, APICountData> = {}
        const userSelection: number[] = []
        for(const response of responses) {
            if(!counts[response.choice])
                counts[response.choice] = { count: 0, percent: 0 }
            counts[response.choice].count++
            counts[response.choice].percent = counts[response.choice].count / responses.length

            if(response.steamid == user.steamid2) {
                userSelection.push(Number(response.choice))
            }
        }
        return {
            responses: {
                totalCount: responses.length,
                percentVoted: responses.length / totalUsers,
                counts,
                users: includeUsers ? responses.map(r => ({ id: r.steamid, name: r.name, avatarUrl: `${domain}/api/users/${r.steamid}/avatar` })) : undefined
            },
            userSelection
        }
    }

    async fetchDiscussions() {
        const domain = await this.#config.GetKV("domain");
        let [rows] = await this.#db.execute<RowDataPacket[]>("SELECT d.*, u.last_alias as creator_name, (SELECT COUNT(*) FROM `left4dead2-admins`.dash_discussion_comments WHERE discussion_id = d.id) as comments FROM `left4dead2-admins`.dash_discussions d LEFT JOIN `left4dead2`.stats_users u ON u.steamid = d.creator WHERE d.flags & 2 = 0 ORDER BY d.timestamp DESC")
        for(const row of rows) {
            if(row.closed_at && Date.now() - (row.closed_at*1000) > AUTO_ARCHIVE_TIME) {
                // Auto archive
                console.info("[Discuss] Automatically archiving discussion #" + row.id)
                await this.#db.execute(`UPDATE \`left4dead2-admins\`.dash_discussions SET flags = flags | ${APIDiscussionFlags.Archived} WHERE id = ?`, [row.id])
                continue
            }
            const [options] = await this.#db.execute<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.dash_discussion_options WHERE discussion_id = ?", [row.id])
            this.#discussions.set(row.id, {
                id: row.id,
                title: row.title,
                description: row.description,
                timestamp: row.timestamp,
                closedAt: row.closed_at,
                type: row.type,
                options: options.map(o => ({ id: o.id, label: o.label })),
                flags: row.flags,
                commentsCount: row.comments,
                creator: {
                    id: row.creator,
                    name: row.creator_name,
                    avatarUrl: `${domain}/api/user/${row.creator}/avatar`
                },
            })
        }
    }
}