import { test, describe, before, type TestContext, beforeEach, after } from "node:test";

import DB from '../util/db.js'
import * as Repo from '#/modules/logs/LogsRepo.js'
import LogsManager from "../../src/modules/logs/LogsManager.js";
import { cacheManager } from "../util/managers.js";
import type { LogType } from "@srcpanel/common/Logs";

describe("logs", () => {
    let manager: LogsManager;
    before(async() => {
        manager = new LogsManager(DB, cacheManager)
    })

    beforeEach(async () => {
        await DB.execute(`DELETE FROM activity_log`)
    })

    after(async () => await DB.end())
    
    test("add entries", async(t: TestContext) => {
        const count = 10

        const promises = new Array(count)
            .fill(null)
            .map(() => Repo.addLogEntry(DB, "ACTION", "test", null, null, "test"))
        const ids = await Promise.all(promises)

        t.assert.equal(ids.length, count, "number of ids correct")
    })

    test("after entries", async(t: TestContext) => {
        const promises = new Array(10)
            .fill(null)
            .map((_,i) => Repo.addLogEntry(DB, "ACTION", "test", null, null, i.toString()))
        const sortedIds = (await Promise.all(promises))
            .sort((a,b) => a - b)

        // 'after' fetches all *after* given id, so we expect one less than sortedIds
        // fetchLogs also fetches logs in descending order

        const [logs] = await manager.fetchLogs("after", sortedIds[0])
        t.assert.equal(logs.length, sortedIds.length - 1, "expected number of fetched logs")

        t.assert.deepEqual(sortedIds.slice(1).reverse(), logs.map(log => log.id), "expected order")
    })

    test("before entries", async(t: TestContext) => {
        const promises = new Array(10)
            .fill(null)
            .map((_,i) => Repo.addLogEntry(DB, "ACTION", "test", null, null, i.toString()))
        const sortedIds = (await Promise.all(promises))
            .sort((a,b) => a - b)

        // 'before' fetches all *before* or equal to given id, so we expect same length
        // fetchLogs also fetches logs in descending order

        const [logs] = await manager.fetchLogs("before", sortedIds[sortedIds.length - 1])
        t.assert.equal(logs.length, sortedIds.length, "expected number of fetched logs")

        t.assert.deepEqual(sortedIds.reverse(), logs.map(log => log.id), "expected order")
    })
})