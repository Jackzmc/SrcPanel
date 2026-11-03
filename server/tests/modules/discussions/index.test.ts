import { test, describe, before, type TestContext, beforeEach, after } from "node:test";

import DiscussionManager from "#/modules/discussions/DiscussionManager.js";
import DB from '../../util/db.js'
import { authManager, taskManager }  from '../../util/managers.js'

import * as Repo from '#/modules/discussions/DiscussionRepo.js'
import { APIDiscussionType } from "@srcpanel/common/Discussions";
import { TABLE_PREFIX } from "../../../src/core/database.js";

describe("discussions repo", (t) => {
    let manager: DiscussionManager;
    before(async() => {
        // TODO: wipe + insert sample data
        // manaWger = new DiscussionManager(DB, authManager, taskManager)
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
            const id = await Repo.createDiscussion(DB, "DUMMY", "Test Discussion Multi", "Testing 123", null, APIDiscussionType.Checkbox, 0)
            console.log("created discussion", id)
        })
        test("create single discussion", async () => {
            const id = await Repo.createDiscussion(DB, "DUMMY", "Test Discussion Single", "Testing 123", null, APIDiscussionType.Radio, 0)
            console.log("created discussion", id)
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
    })
})