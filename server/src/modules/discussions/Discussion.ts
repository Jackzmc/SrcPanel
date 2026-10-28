import { BaseDiscussion } from "@srcpanel/common/Discussions";
import { Pool } from "mysql2";

export class Discussion {
    #pool: Pool
    #base: BaseDiscussion
    #commentsCount?: number

    constructor(pool: Pool, base: BaseDiscussion, commentsCount?: number) {
        this.#pool = pool
        this.#base = base
        this.#commentsCount = commentsCount
    }

    get isClosed() {
        return Date.now() > this.#base.closedAt * 1000
    }

    get commentsCount() {
        return this.#commentsCount
    }

    async refresh() {

    }

    async getComments() {

    }

    async getResponses() {
        
    }
}