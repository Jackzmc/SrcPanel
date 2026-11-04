import { test, describe, before, type TestContext, beforeEach, after } from "node:test";

import DiscussionManager from "#/modules/discussions/DiscussionManager.js";
import DB from '../../util/db.js'
import { authManager }  from '../../util/managers.js'

import * as Repo from '#/modules/discussions/DiscussionRepo.js'
import { APIDiscussionFlags, APIDiscussionType } from "@srcpanel/common/Discussions";
import { TABLE_PREFIX } from "../../../src/core/database.js";

describe("discussions repo", (t) => {
    let manager: DiscussionManager;
    before(async() => {
        // TODO: wipe + insert sample data
        manager = new DiscussionManager(DB, authManager)
    })

    beforeEach(async () => {
        await DB.execute(`DELETE FROM ${TABLE_PREFIX}_discussion_comments`)
        await DB.execute(`DELETE FROM ${TABLE_PREFIX}_discussion_options`)
        await DB.execute(`DELETE FROM ${TABLE_PREFIX}_discussion_responses`)
        await DB.execute(`DELETE FROM ${TABLE_PREFIX}_discussions`)
    })

    after(async () => await DB.end())

    describe("create discussions", () => {
        test("create multi discussion", async () => {
            await Repo.createDiscussion(DB, "DUMMY", "Test Discussion Multi", "Testing 123", null, APIDiscussionType.Checkbox, 0)
        })
        test("create single discussion", async () => {
            await Repo.createDiscussion(DB, "DUMMY", "Test Discussion Single", "Testing 123", null, APIDiscussionType.Radio, 0)
        })
        test("discussion has correct fields", async (t: TestContext) => {
            const id = await Repo.createDiscussion(DB, "DUMMY", "Test", "Testing 123", null, APIDiscussionType.Radio, 0)
            const discuss = await Repo.getDiscussion(DB, id)

            t.assert.ok(discuss, 'discussion exists');

            t.assert.equal(discuss.creator.id, "DUMMY", "creator ID set")
            t.assert.equal(discuss.title, "Test", "has a title")
            t.assert.equal(discuss.description, "Testing 123", "has description")
            t.assert.equal(discuss.closedAt, null, "has no closed date")
            t.assert.equal(discuss.type, APIDiscussionType.Radio, "is type radio")
            t.assert.equal(discuss.flags, 0, "no flags")
        })
        test("create discussion with options", async (t: TestContext) => {
            const id = await Repo.createDiscussion(DB, "DUMMY", "Test Discussion Single", "Testing 123", null, APIDiscussionType.Radio, 0)
            await Repo.insertOption(DB, id, "Option A")
            await Repo.insertOption(DB, id, "Option B")

            const discuss = await manager.fetchDiscussion(id)
            t.assert.ok(discuss, 'discussion exists');

            t.assert.ok(discuss.options, "has options")
            t.assert.equal(discuss.options.length, 2, "has 2 options")
            t.assert.equal(discuss.options[0].label, "Option A", "option A exists")
            t.assert.equal(discuss.options[1].label, "Option B", "option B exists")
        })


    })

    describe("edit discussion", () => {
        test("changing discussion type", async (t: TestContext) => {
            const id = await Repo.createDiscussion(DB, "DUMMY", "Test Discussion", "Testing 123", null, APIDiscussionType.Checkbox, 0)
            const firstDiscuss = await Repo.getDiscussion(DB, id)
            t.assert.ok(firstDiscuss)
            t.assert.equal(firstDiscuss.type, APIDiscussionType.Checkbox)

            await Repo.updateDiscussion(DB, id, "Test Discussion", "Testing 123", null, APIDiscussionType.Radio, 0)
            const secondDiscuss = await Repo.getDiscussion(DB, id)
            t.assert.ok(secondDiscuss)
            t.assert.equal(secondDiscuss.type, APIDiscussionType.Radio, "type changed")

            t.assert.equal(firstDiscuss.timestamp, secondDiscuss.timestamp, "timestamp not change")
        })
    })

    describe("comments", () => {
        test("ensure manager shows public comments with other flags", async (t: TestContext) => {
            const id = await Repo.createDiscussion(DB, "DUMMY", "Test Discussion", "Testing 123", null, APIDiscussionType.Checkbox, APIDiscussionFlags.CommentsPublic | APIDiscussionFlags.PercentsPublic)

            await Repo.insertComment(DB, id, "Creator", "Example")

            await manager.fetchDiscussion(id)
            const comments = await manager.getComments(id)

            t.assert.equal(comments.length, 1)
            t.assert.ok(comments[0].creator, "creator exists")
            t.assert.equal(comments[0].creator.id, "Creator")
            t.assert.equal(comments[0].content, "Example")
        })

        test("ensure manager shows public comments", async (t: TestContext) => {
            const id = await Repo.createDiscussion(DB, "DUMMY", "Test Discussion", "Testing 123", null, APIDiscussionType.Checkbox, APIDiscussionFlags.CommentsPublic)

            await Repo.insertComment(DB, id, "Creator", "Example")

            await manager.fetchDiscussion(id)
            const comments = await manager.getComments(id)

            t.assert.equal(comments.length, 1)
            t.assert.ok(comments[0].creator, "creator exists")
            t.assert.equal(comments[0].creator.id, "Creator")
            t.assert.equal(comments[0].content, "Example")
        })

        test("ensure manager shows anonymous comments", async (t: TestContext) => {
            const id = await Repo.createDiscussion(DB, "DUMMY", "Test Discussion", "Testing 123", null, APIDiscussionType.Checkbox, 0)

            await Repo.insertComment(DB, id, "Creator", "Example")

            await manager.fetchDiscussion(id)
            const comments = await manager.getComments(id)

            t.assert.equal(comments.length, 1)
            t.assert.equal(comments[0].creator, null, "creator not exist")
            t.assert.equal(comments[0].content, "Example")
        })
    })

    describe("submissions", () => {
        test("submission counts match", async (t: TestContext) => {
            const id = await Repo.createDiscussion(DB, "DUMMY", "Test Discussion", "Testing 123", null, APIDiscussionType.Checkbox, 0)
            const optionA = await Repo.insertOption(DB, id, "Option A")
            const optionB = await Repo.insertOption(DB, id, "Option B")

            await Repo.insertAnswerChoice(DB, id, "DUMMY A", optionA)
            await Repo.insertAnswerChoice(DB, id, "DUMMY B", optionB)
            await Repo.insertAnswerChoice(DB, id, "DUMMY C", optionA)

            await manager.fetchDiscussion(id)
            const results = await manager.getSubmissions(id)
            console.log(results)

            t.assert.equal(results.totalVoted, 3, "number voted match")
            // we cannot check percents as the # eligble voters is tied to # of admins, 
            // which we do not control here as we use dummy users
            t.assert.equal(results.users, undefined, "users not provided")
            t.assert.equal(results.options.length, 2, "number of options match")
            t.assert.equal(results.options[0].count, 2, "option A selected twice")
            t.assert.equal(results.options[1].count, 1, "option A selected once")
        })
    })
})