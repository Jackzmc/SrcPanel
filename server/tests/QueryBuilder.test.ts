import { test, describe, before, type TestContext, beforeEach, after } from "node:test";
import { QueryBuilder } from "../src/modules/QueryBuilder.js";

import DB from './util/db.js'
import { RowDataPacket } from "mysql2";

describe("QueryBuilder", () => {

    before(async() => {
        await DB.execute("DROP TABLE IF EXISTS querybuilder")
        await DB.execute("CREATE TABLE querybuilder (col_a VARCHAR(64) NULL, col_b VARCHAR(64) NULL)")
    })

    beforeEach(async() => {
        await DB.query("DELETE FROM querybuilder WHERE 1=1")
    })

    after(async() => await DB.end())

    test("valid select statement that works", async (t: TestContext) => {
        // Add dummy data
        await DB.query("INSERT INTO querybuilder (col_a, col_b) VALUES ('1','2')")

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
        await DB.query("INSERT INTO querybuilder (col_a, col_b) VALUES ('1','1'), ('2','2')")

        const q = QueryBuilder.startSelect("querybuilder", "e")
            .select("col_a")
            .where('col_b', "=", '2')

        const [rows] = await q.execute(DB)

        t.assert.equal(rows.length, 1)
        t.assert.equal(rows[0].col_a, '2')
    })

})