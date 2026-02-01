import { expect, describe, test } from 'vitest'
import { LogEntryUser, parseLogMessage } from '@/js/logs.js'

export function formatUser(user: LogEntryUser, uid: number = 1) {
    return formatUserEx(user.name, user.steamid, uid)
}

export function formatUserEx(name: string, steamid: string | null, uid: number = 1) {
    return `"${name ?? ''}<${uid}><${steamid ?? ''}><>"`
}

describe("formatUser", () => {
    test("format ex with name and steamid", () => {
        expect(formatUserEx("Name", "BOT", 1)).toBe(`"Name<1><BOT><>"`)
    })
    test("format ex with name and null steamid", () => {
        expect(formatUserEx("Name", null, 4)).toBe(`"Name<4><><>"`)
    })
    test("format ex with invalid name", () => {
        expect(formatUserEx(null!, null, 1)).toBe(`"<1><><>"`)
    })
})

describe("parse log messages", () => {
    test("detects no lpieces", t => {
        const { parts, lPieceCount } = parseLogMessage("this message has no lpieces")

        expect(parts.length, "one msg part").toBe(1) // only 1 normal msg
        expect(lPieceCount, "zero lpieces found").toBe(0)
    })

    test("one lpiece of client, as bot", t => {
        const { parts, lPieceCount } = parseLogMessage(`"Name<20><BOT><>" ran a command "sm_blah"`)

        expect(parts.length, "two parts").toBe(2) // only 1 normal msg
        expect(lPieceCount, "one lpiece found").toBe(1)

        expect(parts[0].type, "first part is client").toBe("client")
        // It should guess that it's a client
        expect(parts[0].user?.steamid, "first part is bot").toBe("BOT")
        expect(parts[1].type, "last part is msg").toBe("none")

    })

    test("two lpiece of client and target", t => {
        const { parts, lPieceCount } = parseLogMessage(`"Name<20><BOT><>" did something to "Other Name<30><BOT><>"`)

        console.debug(parts)

        expect(parts[0].type, "first part is client").toBe("client")
        expect(parts[1].type, "middle part is none").toBe("none")
        // expect(parts[2].type, "last part is target").toBe("target")
    })

    test("lpiece guesses client", t => {
        const { parts, lPieceCount } = parseLogMessage(`"Name<20><BOT><>" did something`)

        console.debug(parts)

        expect(parts[0].type, "first part guessed as client").toBe("client")
    })

    test("two lpiece with one guess", t => {
        const client: LogEntryUser = {
            name: "Client User",
            steamid: "STEAM_0:0:00000"
        }
        const { parts, lPieceCount } = parseLogMessage(`${formatUser(client)} did something to ${formatUserEx("Name", "BOT")}`, client)

        expect(parts[0].type, "first part").toBe("client")
        expect(parts[1].type, "middle part").toBe("none")
        expect(parts[2].type, "last part").toBe("target")
    })

    test("two lpiece with one guess, swapped", t => {
        const client: LogEntryUser = {
            name: "Client User",
            steamid: "STEAM_0:0:00000"
        }
        const { parts, lPieceCount } = parseLogMessage(`"Name<20><BOT><>" did something to "${client.name}<30><${client.steamid}><>"`, client)

        expect(parts[0].type, "first part").toBe("target")
        expect(parts[1].type, "middle part").toBe("none")
        expect(parts[2].type, "last part").toBe("client")
    })

    test("two lpiece with all known", t => {
        const client: LogEntryUser = {
            name: "Client User",
            steamid: "STEAM_0:0:00000"
        }
        const target: LogEntryUser = {
            name: "Target User",
            steamid: "STEAM_1:1:11111"
        }
        const { parts, lPieceCount } = parseLogMessage(`${formatUser(target)} did something to ${formatUser(client)}`, client, target)

        expect(lPieceCount).toBe(2)
        expect(parts.length).toBe(3)

        expect(parts[0].type, "first part").toBe("target")
        expect(parts[0].user!.name, "first part").toBe(target.name)
        expect(parts[0].user!.steamid, "first part").toBe(target.steamid)

        expect(parts[1].type, "middle part").toBe("none")

        expect(parts[2].type, "last part").toBe("client")
        expect(parts[2].user!.name, "first part").toBe(client.name)
        expect(parts[2].user!.steamid, "first part").toBe(client.steamid)
    })

    test("two lpiece with 2 given, 1 incorrect", t => {
        const client: LogEntryUser = {
            name: "Client User",
            steamid: "STEAM_0:0:00000"
        }
        const target: LogEntryUser = {
            name: "Target User",
            steamid: "STEAM_1:1:11111"
        }
        const invalid: LogEntryUser = {
            name: "I don't exist",
            steamid: "BOT"
        }
        const { parts, lPieceCount } = parseLogMessage(`${formatUser(invalid)} did something to ${formatUser(client)}`, client, target)

        expect(lPieceCount).toBe(2)
        expect(parts.length).toBe(3)

        expect(parts[0].type, "first part").toBe("target")
        expect(parts[0].user!.steamid, "first part").toBe(invalid.steamid)

        expect(parts[1].type, "middle part").toBe("none")

        expect(parts[2].type, "last part").toBe("client")
        expect(parts[2].user!.steamid, "first part").toBe(client.steamid)
    })

    test("example real messages", t => {
        const msg = `"Redacted A<133><STEAM_1:1:000000><>" accepted "Redacted B<62><STEAM_1:0:1000000><>"'s apology (response = 1)`
        const { parts, lPieceCount } = parseLogMessage(msg)

        expect(lPieceCount).toBe(2)
        expect(parts.length).toBe(4)

        // should guess as client
        expect(parts[0].type, "first part").toBe("client")
        expect(parts[0].user!.name, "first part").toBe("Redacted A")

        expect(parts[1].type, "middle part").toBe("none")

        // should be guess as target
        expect(parts[2].type, "last part").toBe("target")
        expect(parts[2].user!.name, "first part").toBe("Redacted B")
    })
})


