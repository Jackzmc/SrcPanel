import { test, describe, before, type TestContext, beforeEach, after } from "node:test";
import { QueryBuilder, SortDirection } from "../src/modules/QueryBuilder.js";

import DB from './util/db.js'
import { RowDataPacket } from "mysql2";
import { doTransaction } from "../src/core/database.js";

describe("QueryBuilder", () => {

    before(async() => {
        await doTransaction(DB, async(conn) => {
            await conn.execute("DROP TEMPORARY TABLE IF EXISTS querybuilder")
            await conn.execute("CREATE TEMPORARY TABLE querybuilder (col_a VARCHAR(64) NULL, col_b VARCHAR(64) NULL)")
        })

    })

    beforeEach(async() => {
        await DB.execute("DELETE FROM querybuilder")
    })


    after(async() => {
        await DB.execute('DROP TEMPORARY TABLE IF EXISTS querybuilder');
        await DB.end()
    })

    test("valid select statement that works", async (t: TestContext) => {
        // Add dummy data
        await DB.execute("INSERT INTO querybuilder (col_a, col_b) VALUES ('1','2')")

        const q = QueryBuilder.startSelect("querybuilder", "e")
        q.select("col_a")

        const [query, data] = q.build()

        console.log("query", query)

        t.assert.ok(query.includes('SELECT'), "contains select keyword")
        t.assert.ok(query.includes('col_a'), "contains column")
        t.assert.ok(query.includes('querybuilder'), "contains table")

        const [rows] = await DB.query<RowDataPacket[]>(query, data)

        console.log("rows", rows)

        t.assert.equal(rows.length, 1)
        t.assert.equal(rows[0].col_a, '1')
    })

    test("valid where conditions are correct", (t: TestContext) => {
        const q = QueryBuilder.startSelect("example_table", "e")
        q.where("a", "=", "0")
        q.where("b", "=", "1")

        const [query, data] = q.build()

        t.assert.ok(query.includes('WHERE'), "includes where")
        t.assert.ok(query.includes('AND'), "includes an AND")

        t.assert.equal(data.length, 2, "data array's length is correct")
    })

    test("valid where that works", async (t: TestContext) => {
        // Add dummy data
        await DB.execute("INSERT INTO querybuilder (col_a, col_b) VALUES ('1','1'), ('2','2')")

        const q = QueryBuilder.startSelect("querybuilder", "e")
            .select("col_a")
            .where('col_b', "=", '2')

        const [rows] = await q.execute(DB)

        t.assert.equal(rows.length, 1)
        t.assert.equal(rows[0].col_a, '2')
    })

    test("query builds are repeatable", (t: TestContext) => {
        // Use all possible options, doesn't need to make sense or be valid
        const q = QueryBuilder.startSelect("querybuilder", "e")
            .select("col_a")
            .where("col_b", "=", "2")
            .join("querybuilder", "col_b", "=", "col_b")
            .limit(20, 5)
            .sort("col_a", SortDirection.Ascending)
            .partition("part")
        
        const build1 = q.build()
        const build2 = q.build()

        t.assert.equal(build1[0], build2[0], "build statements match")
        t.assert.deepEqual(build1[1], build2[1], "build data match")
        t.assert.equal(build1[1].length, 3, "query data correct amount")
    })

})