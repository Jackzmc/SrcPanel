import { APICountData, APIDiscussionFlags, APIResponsesData, type APIComment, type APIDiscussionOption, type APIDiscussionType, type APISubmissions, type SubmissionEntry, type UserSubmission } from "@srcpanel/common/Discussions";
import { Pool, RowDataPacket } from 'mysql2/promise';
import User from "../users/User.js";
import AuthManager from "../auth/AuthManager.js";
import { DefinedTask } from "../tasks/Task.js";
import { ADMINS_DB, doTransaction, TABLE_PREFIX } from "../../core/database.js";
import TaskManager from "../tasks/TaskManager.js";
import Logger, { PinoLogger } from '#/util/logger.js'
import * as Repo from "./DiscussionRepo.js";
import Discussion from "@srcpanel/common/discussions/Discussion";
import type { APIUser } from "@srcpanel/common/User";

const AUTO_ARCHIVE_TIME = 1000 * 60 * 60 * 24 * 10 // 10 days
const CACHE_TTL = 1000 * 60 * 60 * 1

export default class DiscussionManager {
    #db: Pool
    #log: PinoLogger
    #authmngr: AuthManager

    #lastFetchTime: number = 0

    // Holds unarchived discussions
    #discussions = new Map<number, Discussion>()

    #fetchJob: DefinedTask


    constructor(db: Pool, authmngr: AuthManager, jobs?: TaskManager) {
        this.#log = Logger.child({ name: "Discussions" })
        this.#db = db
        this.#authmngr = authmngr

        if(jobs) {
            const task = async () => {
                this.#lastFetchTime = Date.now()
                await this.fetchDiscussions()
            }
            this.#fetchJob = jobs.register("discussions.fetch", task.bind(this))
            jobs.scheduleRepeating(this.#fetchJob, { hours: 2 })
            task()
        }
    }

    async #tryRefresh() {
        if(Date.now() - this.#lastFetchTime > CACHE_TTL) {
            this.#lastFetchTime = Date.now()
            await this.fetchDiscussions()
        }
    }

    async get(id: number) {
        await this.#tryRefresh()
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
     * Gets the submissions for a specific user
     * @param discussionId discussion id
     * @param user the user to fetch for
     * @returns list of either one single text submission or list of selected choices
     */
    async getUserSubmissions(discussionId: number, user: User): Promise<UserSubmission[]> {
        return await Repo.getUserSubmissions(this.#db, discussionId, user.steamid2)
    }

    /**
     * Gets all submissions for given discussion
     * @param discussionId 
     */
    async getSubmissions(discussionId: number): Promise<APISubmissions> {
        const discuss = await this.get(discussionId)
        if(!discuss) throw new Error("Discussion not found")
        /**
         * MUST CONSIDER FLAGS:
         * ~APIDiscussionFlags.PercentsPublic~ - unused
         * APIDiscussionFlags.RespondersPublic
         * APIDiscussionFlags.ResponsesPublic
         */
        const submissions = await Repo.getSubmissions(this.#db, discussionId)
        const elgibleVoters = this.#authmngr.AdminCount

        const users = new Set<APIUser>()
        const options = new Map<number, APIDiscussionOption & APICountData>()

        for(const entry of submissions) {
            users.add(entry.user)
            if('choice' in entry) {
                let option = options.get(entry.choice.id)
                if(!option) option = { 
                    id: entry.choice.id,
                    label: entry.choice.label,
                    count: 0,
                    percent: 0.0
                }
                option.count++
                option.percent = elgibleVoters > 0 ? option.count / elgibleVoters : 0
                options.set(entry.choice.id, option)
            }
        }

        // We need the unique count of users, but depending on the discussion, multiple submissions can be made per user
        const totalVoted = users.size

        const shownUsers = discuss.submittersPublic ? submissions.map(sub => {
            return {
                user: sub.user,
                choice: discuss.submissionsPublic && 'choice' in sub ? sub.choice : undefined,
                text: discuss.submissionsPublic && 'text' in sub ? sub.text : undefined
            } as SubmissionEntry
        }) : undefined

        return {
            totalVoted,
            percentVoted: elgibleVoters > 0 ? submissions.length / elgibleVoters : 0,
            options: Object.values(options),
            users: shownUsers
        }
    }

    async getArchivedCount(): Promise<number> {
        return await Repo.getArchivedCount(this.#db)
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

    async setAnswerChoice(discussionId: number, user: User, choiceIds: number | number[]) {
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
        const discuss = await this.get(discussionId)
        if(!discuss) throw Error("Discussion not found")
        const withCreator = (discuss.flags & APIDiscussionFlags.CommentsPublic) == APIDiscussionFlags.CommentsPublic

        return Repo.getComments(this.#db, discussionId, withCreator)
    }

    async submitComment(discussionId: number, user: User, content: string) {
        const discuss = await this.get(discussionId)
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