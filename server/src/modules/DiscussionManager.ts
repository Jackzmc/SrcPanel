import { APICountData, APIDiscussionCacheableData, APIDiscussionFlags, APIResponsesData, APIUserWithChoice } from "../../../common-types/Discussions.js";
import ConfigManager from "./ConfigManager.js";
import { Pool, RowDataPacket } from 'mysql2/promise';
import User from "./users/User.js";
import AuthManager from "./auth/AuthManager.js";

const AUTO_ARCHIVE_TIME = 1000 * 60 * 60 * 24 * 10 // 10 days
const CACHE_TTL = 1000 * 60 * 60 * 1

export default class DiscussionManager {
    #db: Pool
    #config: ConfigManager
    #authmngr: AuthManager

    #lastFetchTime

    #discussions = new Map<number, APIDiscussionCacheableData>()

    constructor(db: Pool, config: ConfigManager, authManager: AuthManager) {
        this.#db = db
        this.#config = config
        this.#authmngr = authManager
    }

    async #tryRefresh() {
        if(Date.now() - this.#lastFetchTime > CACHE_TTL) {
            this.#lastFetchTime = Date.now()
            await this.fetchDiscussions()
        }
    }

    get(id: number) {
        this.#tryRefresh()
        return this.#discussions.get(id)
    }

    getAll() {
        this.#tryRefresh()
        return [...this.#discussions.values()].sort((b,a) => b.timestamp - a.timestamp)
    }

    set(id: number, discussion: APIDiscussionCacheableData) {
        this.#discussions.set(id, discussion)
    }

    delete(id: number) {
        this.#discussions.delete(id)
    }

    async getUnrespondedCount(steamid2: string) {
        // Returns the number of non-archived, non-closed discussions user has responded to
        const [rows] = await this.#db.execute<RowDataPacket[]>(
            `SELECT discussion_id FROM \`left4dead2-admins\`.dash_discussion_responses r JOIN \`left4dead2-admins\`.dash_discussions d ON d.id = r.discussion_id WHERE steamid = ? AND d.flags & ${APIDiscussionFlags.Archived} = 0 AND UNIX_TIMESTAMP() < d.closed_at GROUP BY r.discussion_id`, [steamid2])
        
        const totalOpenDiscussions = [...this.#discussions.values()].filter((d) => !d.closedAt || Date.now() < (d.closedAt*1000)).length
        return totalOpenDiscussions - rows.length
    }

    async getResponses(id: number, user: User, flags: APIDiscussionFlags): Promise<{ responses: APIResponsesData, userSelection: number[] }> {
        const totalUsers = this.#authmngr.AdminCount
        const domain = await this.#config.GetKV("domain", "");
        const [responses] = await this.#db.execute<RowDataPacket[]>(
            "SELECT res.steamid, res.choice, res.text, opt.label, u.last_name as name FROM `left4dead2-admins`.dash_discussion_responses res LEFT JOIN `left4dead2`.view_panel_user u ON SUBSTRING(res.steamid, 11) = u.account_id LEFT JOIN `left4dead2-admins`.dash_discussion_options opt ON opt.id = res.choice WHERE res.discussion_id = ?", [id]
        )
        const counts: Record<string, APICountData> = {}
        const userSelection: number[] = []
        for(const response of responses) {
            if(!counts[response.choice])
                counts[response.choice] = { count: 0, percent: 0 }
            counts[response.choice].count++
            counts[response.choice].percent = counts[response.choice].count / responses.length

            if(response.steamid == user.steamid2) {
                userSelection.push(response.choice)
            }
        }
        let usersResponse: APIUserWithChoice[]|undefined = undefined
        if(flags & APIDiscussionFlags.RespondersPublic) {
            usersResponse = []
            const users = {}
            // Merge multiple responses (for multiselect) into one user object
            for(const response of responses) {
                if(!users[response.steamid]) {
                    users[response.steamid] = { 
                        id: response.steamid, 
                        name: response.name, 
                        avatarUrl: `${domain}/api/users/${response.steamid}/avatar` ,
                        choices: flags & APIDiscussionFlags.RespondersPublic ? [] : undefined
                    }
                }
                if(flags & APIDiscussionFlags.RespondersPublic) {
                    // Try choice, if choice is undefined/null, then its not radio/multi, its text
                    users[response.steamid].choices.push(response.label ?? response.text)
                }
            }
            usersResponse = Object.values(users)
        }
        return {
            responses: {
                totalCount: responses.length,
                percentVoted: responses.length / totalUsers,
                counts,
                users: usersResponse
            },
            userSelection
        }
    }

    async fetchDiscussions() {
        const dis = new Map()
        const domain = await this.#config.GetKV("domain", "");
        let [rows] = await this.#db.execute<RowDataPacket[]>(`SELECT d.*, u.last_name as creator_name, (SELECT COUNT(*) FROM \`left4dead2-admins\`.dash_discussion_comments WHERE discussion_id = d.id) as comments FROM \`left4dead2-admins\`.dash_discussions d LEFT JOIN \`left4dead2\`.view_panel_user u ON SUBSTRING(d.creator, 11) = u.account_id WHERE d.flags & ${APIDiscussionFlags.Archived} = 0 ORDER BY d.timestamp DESC`)
        for(const row of rows) {
            if(row.closed_at && Date.now() - (row.closed_at*1000) > AUTO_ARCHIVE_TIME) {
                // Auto archive
                console.info("[Discuss] Automatically archiving discussion #" + row.id)
                await this.#db.execute(`UPDATE \`left4dead2-admins\`.dash_discussions SET flags = flags | ${APIDiscussionFlags.Archived} WHERE id = ?`, [row.id])
                continue
            }
            const [options] = await this.#db.execute<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.dash_discussion_options WHERE discussion_id = ?", [row.id])
            dis.set(row.id, {
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
                    avatarUrl: `${domain}/api/users/${row.creator}/avatar`
                },
            })
        }
        this.#discussions = dis
    }
}