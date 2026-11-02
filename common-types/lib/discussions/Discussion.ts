import { APIDiscussionFlags, type APIDiscussionCacheableData, type APIDiscussionOption, type APIDiscussionType } from "@srcpanel/common/Discussions";

export default class Discussion {
    #base: APIDiscussionCacheableData
    #options?: APIDiscussionOption[]

    constructor(base: APIDiscussionCacheableData, options: APIDiscussionOption[]) {
        this.#base = base
        this.#options = options
    }

    get base() {
        return this.#base
    }


    get isArchived(): boolean {
        return (this.#base.flags & APIDiscussionFlags.Archived) == APIDiscussionFlags.Archived
    }

    get isClosed(): boolean {
        return this.isArchived 
            || (this.#base.closedAt != null && Date.now() > this.#base.closedAt * 1000)
    }

    get commentsCount(): number {
        return this.#base.commentsCount
    }

    get id(): number {
        return this.#base.id
    }

    get title(): string {
        return this.#base.title
    }

    get description(): string | null {
        return this.#base.description ?? null
    }

    get type(): APIDiscussionType {
        return this.#base.type
    }

    get createdAt(): Date {
        return new Date(this.#base.timestamp * 1000)
    }

    get closedAt(): Date | null {
        return this.#base.closedAt 
            ? new Date(this.#base.closedAt * 1000)
            : null
    }

    get creatorId(): string {
        return this.#base.creator.id
    }

    get creatorName(): string | null {
        return this.#base.creator.name ?? null
    }

    get flags(): number {
        return this.#base.flags
    }

    get options(): APIDiscussionOption[] | null {
        return this.#options ?? null
    }
}