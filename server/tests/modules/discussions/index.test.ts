// TODO: setup DiscussionManager, test all methods
import assert from 'node:assert/strict';
import { test, describe, before } from "node:test";

import DiscussionManager from "#/modules/discussions/DiscussionManager.js";
import DB from '../../util/db.js'
import { authManager, taskManager }  from '../../util/managers.js'


describe("main", async (t) => {
    let manager: DiscussionManager;
    before(() => {
        // TODO: wipe + insert sample data
        manager = new DiscussionManager(DB, authManager, taskManager)
    })

    test("fetched discussions include right fields", async (t) => {
        await manager.fetchDiscussions()
        const discussions = manager.getAll()
        discussions.forEach(discuss => {
            t.assert.equal(typeof discuss.creator, "object", "creator object")
            t.assert.equal(typeof discuss.creator.id, "string", "creator id")
            t.assert.equal(typeof discuss.id, "number", "id")
            t.assert.equal(typeof discuss.title, "string", "title")
            t.assert.equal(typeof discuss.description === "string" || discuss.description == null, true, "description")
            t.assert.equal(typeof discuss.timestamp, "number", "timestamp")
            t.assert.equal(typeof discuss.closedAt, "number", "closedat")
            t.assert.equal(typeof discuss.type, "number", "type")
            t.assert.equal(typeof discuss.flags, "number", "flags")
        })
    })


})