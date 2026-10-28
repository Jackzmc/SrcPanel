// TODO: setup DiscussionManager, test all methods

import DiscussionManager from "#/modules/discussions/DiscussionManager.js";
import { assert, describe, it } from "node:test";
import DB from '../../util/db.js'

import { authManager, taskManager }  from '../../util/managers.js'

const manager = new DiscussionManager(DB, authManager, taskManager)

describe("main", () => {
    it("test", async () => {
        await manager.fetchDiscussions()
        const discussions = manager.getAll()
        console.log(discussions)
    })
})