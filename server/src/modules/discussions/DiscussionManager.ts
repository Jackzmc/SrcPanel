import { APICountData, APIDiscussionCacheableData, APIDiscussionFlags, APIResponsesData, APIUserWithChoice, type APIComment, type APIDiscussionType } from "@srcpanel/common/Discussions";
import { Pool, RowDataPacket } from 'mysql2/promise';
import User from "../users/User.js";
import AuthManager from "../auth/AuthManager.js";
import { DefinedTask } from "../tasks/Task.js";
import { ADMINS_DB, doTransaction, MAIN_DB, TABLE_PREFIX } from "../../core/database.js";
import TaskManager from "../tasks/TaskManager.js";
import Logger, { PinoLogger } from '#/util/logger.js'
import * as Repo from "./DiscussionRepo.js";
import Discussion from "@srcpanel/common/discussions/Discussion";
import { linesToRowsIterable } from "@influxdata/influxdb-client";

const AUTO_ARCHIVE_TIME = 1000 * 60 * 60 * 24 * 10 // 10 days
const CACHE_TTL = 1000 * 60 * 60 * 1

export default class DiscussionManager {
    #db: Pool
    #log: PinoLogger
    #authmngr: AuthManager

    #lastFetchTime: number = 0

    #discussions = new Map<number, Discussion>()

    #fetchJob: DefinedTask


    constructor(db: Pool, authmngr: AuthManager, jobs: TaskManager) {
        this.#log = Logger.child({ name: "Discussions" })
        this.#db = db
        this.#authmngr = authmngr

        const task = async () => {
            this.#lastFetchTime = Date.now()
            await this.fetchDiscussions()
        }
        this.#fetchJob = jobs.register("discussions.fetch", task.bind(this))
        jobs.scheduleRepeating(this.#fetchJob, { hours: 2 })
        jobs.schedule(this.#fetchJob, { seconds: 0 })
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
        return [...this.#discussions.values()]
            .sort((a,b) => b.createdAt.valueOf() - a.createdAt.valueOf())
    }

    set(id: number, discussion: Discussion) {
        this.#discussions.set(id, discussion)
    }

    delete(id: number) {
        this.#discussions.delete(id)
    }

    /**
     * Returns the amount of discussions user has not responded to
     * @param steamid2 
     * @returns number
     */
    async getUnrespondedCount(steamid2: string) {
        // Returns the number of non-archived, non-closed discussions user has responded to
        const [rows] = await this.#db.execute<RowDataPacket[]>(`
            SELECT discussion_id 
            FROM \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussion_responses r 
            JOIN \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussions d ON d.id = r.discussion_id 
            WHERE steamid = ? 
                AND d.flags & ${APIDiscussionFlags.Archived} = 0 
                AND UNIX_TIMESTAMP() < d.closed_at 
            GROUP BY r.discussion_id`, 
            [steamid2]
        )
        
        const totalOpenDiscussions = [...this.#discussions.values()]
            .filter((d) => !d.isClosed).length
        return totalOpenDiscussions - rows.length
    }

    /**
     * Get all the discussion responses, with the user's choice included.
     * If discussion is public, other user's choices included, but the user's choice is always included
     * @param id discussion id
     * @param user user to get their choice for
     * @param flags discusion flags to select for
     * @returns 
     */
    async getResponses(id: number, user: User, flags: APIDiscussionFlags): Promise<{ responses: APIResponsesData, userSelection: number[] }> {
        const totalUsers = this.#authmngr.AdminCount
        const [responses] = await this.#db.execute<RowDataPacket[]>(`
            SELECT 
                res.steamid, 
                res.choice, 
                res.text, 
                opt.label, 
                u.last_name as name 
            FROM \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussion_responses res 
            LEFT JOIN \`${MAIN_DB}\`.view_${TABLE_PREFIX}_user u ON SUBSTRING(res.steamid, 11) = u.account_id 
            LEFT JOIN \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussion_options opt ON opt.id = res.choice 
            WHERE res.discussion_id = ?`, 
            [id]
        )
        const counts: Record<string, APICountData> = {}
        const userSelection: number[] = []
        for(const response of responses) {
            if(!counts[response.choice])
                counts[response.choice] = { count: 0, percent: 0 }
            counts[response.choice].count++
            counts[response.choice].percent = counts[response.choice].count / responses.length
            // Always include user's response
            if(response.steamid == user.steamid2) {
                userSelection.push(response.choice)
            }
        }
        let usersResponse: APIUserWithChoice[]|undefined = undefined
        if(flags & APIDiscussionFlags.RespondersPublic) {
            const users = {}
            // Merge multiple responses (for multiselect) into one user object
            for(const response of responses) {
                if(!users[response.steamid]) {
                    users[response.steamid] = { 
                        id: response.steamid, 
                        name: response.name, 
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
        const discussions = await Repo.getDiscussions(this.#db)
        for(const row of discussions) {
            const options = await Repo.getOptions(this.#db, row.id)
            const disc = new Discussion(row, options)
            if(disc.closedAt && disc.closedAt.getTime() > AUTO_ARCHIVE_TIME) {
                // Auto archive
                this.#log.info({ id: row.id }, "Automatically archiving discussion")
                await Repo.setDiscussionFlags(this.#db, disc.id, disc.flags | APIDiscussionFlags.Archived)
                this.#discussions.delete(row.id) // remove from cache
                continue
            }
            this.#discussions.set(row.id, disc)
        }
    }

    async fetchDiscussion(id: number) {
        const data = await Repo.getDiscussion(this.#db, id)
        if(!data) throw new Error("Unknown discussion")
        const options = await Repo.getOptions(this.#db, data.id)
        const disc = new Discussion(data, options)
        this.#discussions.set(disc.id, disc)
        return disc
    }
    
    async setAnswerText(discussionId: number, user: User, text: string) {
        await doTransaction(this.#db, async (tx) => {
            await Repo.clearAnswers(tx, discussionId, user.steamid2)
            await Repo.insertAnswerText(tx, discussionId, user.steamid2, text)
        })
        await this.fetchDiscussion(discussionId)
    }

    async setAnswerChoice(discussionId: number, user: User, choiceIds: string | string[]) {
        await doTransaction(this.#db, async (tx) => {
            await Repo.clearAnswers(tx, discussionId, user.steamid2)
            if(Array.isArray(choiceIds)) {
                for(const val of choiceIds) {
                    await Repo.insertAnswerChoice(tx, discussionId, user.steamid2, val)
                }
            } else {
                await Repo.insertAnswerChoice(tx, discussionId, user.steamid2, choiceIds)
            }
        })
        await this.fetchDiscussion(discussionId)
    }

    async updateDiscussion(discussionId: number, 
        title: string, description: string | null, closedAt: number | null, type: APIDiscussionType, flags: number, 
        options?: { label: string }[]
    ) {
        await doTransaction(this.#db, async (tx) => {
            await Repo.clearOptions(tx, discussionId)
            await Repo.updateDiscussion(tx, discussionId, title, description, closedAt, type, flags)
            if(options) {
                for(const option of options) {
                    await Repo.insertOption(tx, discussionId, option.label)
                }
            }
        })
        await this.fetchDiscussion(discussionId)
    }

    async createDiscussion(
        creator: User, title: string, description: string | null, closedAt: number | null, type: APIDiscussionType, flags: number, 
        options?: { label: string }[]
    ): Promise<number> {
        const id = await doTransaction(this.#db, async (tx) => {
            const id = await Repo.createDiscussion(tx, creator.steamid2, title, description, closedAt, type, flags)
            if(options) {
                for(const option of options) {
                    await Repo.insertOption(tx, id, option.label)
                }
            }
            return id
        })
        await this.fetchDiscussion(id)
        return id
    }

    async getComments(
        discussionId: number,
    ): Promise<APIComment[]> {
        const discuss = this.get(discussionId)
        if(!discuss) throw Error("Discussion not found")
        const withCreator = (discuss.flags & APIDiscussionFlags.CommentsPublic) == APIDiscussionFlags.CommentsPublic

        return Repo.getComments(this.#db, discussionId, withCreator)
    }

    async submitComment(discussionId: number, user: User, content: string) {
        const discuss = this.get(discussionId)
        if(!discuss) throw Error("Discussion not found")
        const withCreator = (discuss.flags & APIDiscussionFlags.CommentsPublic) == APIDiscussionFlags.CommentsPublic

        const name = withCreator ? await user.name() : 'Someone'

        await this.#authmngr.addNotification(discuss.creatorId, 
            `${name} commented on your discussion "${discuss.title}"`, 
            {
                link: `/discuss/${discuss.id}`,
            }
        )

        const id = await Repo.insertComment(this.#db, discussionId, user.steamid2, content)
        await this.fetchDiscussion(discussionId) // refresh cache
        return id
    }

}