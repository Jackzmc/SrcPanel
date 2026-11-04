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

    test("around entries", async(t: TestContext) => {
        const promises = new Array(10)
            .fill(null)
            .map((_,i) => Repo.addLogEntry(DB, "ACTION", "test", null, null, i.toString()))
        const sortedIds = (await Promise.all(promises))
            .sort((a,b) => a - b)

        const [logs] = await manager.fetchLogs("around", sortedIds[Math.floor(sortedIds.length / 2)])
        t.assert.equal(logs.length, sortedIds.length, "expected number of fetched logs")

        t.assert.deepEqual(sortedIds.reverse(), logs.map(log => log.id), "expected order")
    })

    test("search message",  async(t: TestContext) => {
        await Repo.addLogEntry(DB, "ACTION", "test", null, null, "message_1")
        await Repo.addLogEntry(DB, "ACTION", "test", null, null, "message_2")

        const [logs] = await manager.fetchLogsAfter(null, { searchMessage: 'message_2' })

        t.assert.equal(logs.length, 1, "found one log")
        t.assert.equal(logs[0].message, "message_2")
    })

    test("search client",  async(t: TestContext) => {
        await Repo.addLogEntry(DB, "ACTION", "test", "client_1", null, "message_1")
        await Repo.addLogEntry(DB, "ACTION", "test", "client_2", null, "message_2")

        const [logs] = await manager.fetchLogsAfter(null, { searchClient: 'client_1' })

        t.assert.equal(logs.length, 1, "found one log")
        t.assert.equal(logs[0].client, "client_1")
    })

    test("search target",  async(t: TestContext) => {
        await Repo.addLogEntry(DB, "ACTION", "test", null, "target_1", "message_1")
        await Repo.addLogEntry(DB, "ACTION", "test", null, "target_2", "message_2")

        const [logs] = await manager.fetchLogsAfter(null, { searchTarget: 'target_2' })

        t.assert.equal(logs.length, 1, "found one log")
        t.assert.equal(logs[0].target, "target_2")
    })

    test("filter servers",  async(t: TestContext) => {
        await Repo.addLogEntry(DB, "ACTION", "server_1", null, "target_1", "message_1")
        await Repo.addLogEntry(DB, "ACTION", "server_2", null, "target_2", "message_2")

        const [logs] = await manager.fetchLogsAfter(null, { servers: ["server_1"] })

        t.assert.equal(logs.length, 1, "found one log")
        t.assert.equal(logs[0].server, "server_1")
    })

    test("distinct servers", async(t: TestContext) => {
        await Repo.addLogEntry(DB, "ACTION", "server_1")
        await Repo.addLogEntry(DB, "ACTION", "server_1")
        await Repo.addLogEntry(DB, "ACTION", "server_2")
        await Repo.addLogEntry(DB, "ACTION", "server_3")

        const servers = await Repo.getDistinctServers(DB)
        t.assert.equal(servers.length, 3, "3 servers")
    })
})