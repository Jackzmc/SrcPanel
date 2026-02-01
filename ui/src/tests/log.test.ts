import { LogEntryUser, parseLogMessage } from '@/js/logs.js'
import { test } from 'node:test'

test("detects no lpieces", t => {
    const { parts, lPieceCount } = parseLogMessage("this message has no lpieces")

    t.assert.equal(parts.length, 1, "one msg part") // only 1 normal msg
    t.assert.equal(lPieceCount, 0, "zero lpieces found")
})

test("one lpiece of client, as bot", t => {
    const { parts, lPieceCount } = parseLogMessage(`"Name<20><BOT><>" ran a command "sm_blah"`)

    console.log(parts)

    t.assert.equal(parts.length, 2, "two parts") // only 1 normal msg
    t.assert.equal(lPieceCount, 1, "one lpiece found")

    t.assert.equal(parts[0].type, "client", "first part is client")
    // It should guess that it's a client
    t.assert.equal( parts[0].user?.steamid, "BOT", "first part is bot")
    t.assert.equal(parts[1].type, "none", "last part is msg")

})

// test("two lpiece of client and target", t => {
//     const { parts, lPieceCount } = parseLogMessage(`"Name<20><BOT><>" did something to "Other Name<30><STEAM_0:1:010101010><>"`)

//     console.log(parts)

//     t.assert.equal(parts.length, 3, "three parts") // only 1 normal msg
//     t.assert.equal(lPieceCount, 2, "two lpieces found")

//     t.assert.equal(parts[0].type, "client", "first part is client")
//     t.assert.equal(parts[1].type, "none", "middle part is none")
//     t.assert.equal(parts[2].type, "target", "last part is target")
// })

// test("two lpiece of client and target, with given users", t => {
//     const client: LogEntryUser = {
//         name: "Client User",
//         steamid: "STEAM_0:0:00000"
//     }
//     const { parts, lPieceCount } = parseLogMessage(`"Name<20><BOT><>" did something to "${client.name}<30><${client.steamid}><>"`, client)

//     console.log(parts)

//     t.assert.equal(parts.length, 3, "three parts") // only 1 normal msg
//     t.assert.equal(lPieceCount, 2)

//     t.assert.equal(parts[2].type, "target", "first part is target")
//     t.assert.equal(parts[1].type, "none", "middle part is none")
//     t.assert.equal(parts[0].type, "client", "last part is client")
// })