import { test, describe, before, type TestContext, beforeEach, after } from "node:test";
import PlayerManager from "../src/modules/users/PlayerManager.js";
import DB from './util/db.js'
import * as UserRepo from '#/modules/users/Repo.js'
import SteamID from "steamid";

const TEST_USER = SteamID.fromIndividualAccountID(49243767)

describe("user fetching works correctly", () => {

    // before(async() => {
    //     await DB.execute("DELETE * FROM panel_user")
    //     await UserRepo.insertUser(DB, TEST_USER)
    // })

})