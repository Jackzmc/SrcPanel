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
    test("detects no lpieces", () => {
        const { parts, lPieceCount } = parseLogMessage("this message has no lpieces")

        expect(parts.length, "one msg part").toBe(1) // only 1 normal msg
        expect(lPieceCount, "zero lpieces found").toBe(0)
    })

    test("one lpiece of client, as bot", () => {
        const { parts, lPieceCount } = parseLogMessage(`"Name<20><BOT><>" ran a command "sm_blah"`)

        expect(parts.length, "two parts").toBe(2) // only 1 normal msg
        expect(lPieceCount, "one lpiece found").toBe(1)

        expect(parts[0].type, "first part is client").toBe("client")
        // It should guess that it's a client
        expect(parts[0].user?.steamid, "first part is bot").toBe("BOT")
        expect(parts[1].type, "last part is msg").toBe("none")

    })

    test("two lpiece of client and target", () => {
        const { parts, lPieceCount } = parseLogMessage(`"Name<20><BOT><>" did something to "Other Name<30><BOT><>"`)

        expect(parts[0].type, "first part is client").toBe("client")
        expect(parts[1].type, "middle part is none").toBe("none")
        // expect(parts[2].type, "last part is target").toBe("target")
    })

    test("lpiece guesses client", () => {
        const { parts, lPieceCount } = parseLogMessage(`"Name<20><BOT><>" did something`)

        expect(parts[0].type, "first part guessed as client").toBe("client")
    })

    test("two lpiece with one guess", () => {
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

    test("two lpiece with all known", () => {
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

    test("two lpiece with 2 given, 1 incorrect", () => {
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

    test("example real messages", () => {
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

    test("2 unknown but client, target provided", () => {
        const client: LogEntryUser = {
            name: "Client User",
            steamid: "STEAM_0:0:00000"
        }
        const target: LogEntryUser = {
            name: "Target User",
            steamid: "STEAM_0:1:11111"
        }
        // client and target steamids should NOT match and must not be bots
        const msg = `${formatUserEx(client.name, "STEAM_1:0:00000")} did something to ${formatUserEx(target.name, "STEAM_1:1:11111")}`
        const { parts, lPieceCount } = parseLogMessage(msg, client, target)

        expect(lPieceCount).toBe(2)
        expect(parts.length).toBe(3)

        expect(parts[0].type, "first part").toBe("client")
        expect(parts[0].user!.steamid, "first part").toBe("STEAM_1:0:00000")

        expect(parts[2].type, "last part").toBe("target")
        expect(parts[2].user!.steamid, "first part").toBe("STEAM_1:1:11111")
    })

    test("target known and found, client bot unknown", () => {
        const client: LogEntryUser = {
            name: "Botty",
            steamid: "BOT"
        }
        const target: LogEntryUser = {
            name: "Target User",
            steamid: "STEAM_1:1:11111"
        }
        // client and target steamids should NOT match and must not be bots
        const msg = `${formatUser(client)} did something to ${formatUser(target)}`
        const { parts, lPieceCount } = parseLogMessage(msg, /** client NOT known */ undefined, target)

        expect(lPieceCount, "2 matches").toBe(2)
        expect(parts.length).toBe(3)

        expect(parts[0].type, "first part").toBe("client")
        expect(parts[0].user!.steamid, "first part").toBe("BOT")

        expect(parts[2].type, "last part").toBe("target")
        expect(parts[2].user!.steamid, "first part").toBe("STEAM_1:1:11111")
    })

    test("client provided, not found, target found", () => {
        const client: LogEntryUser = {
            name: "Client User",
            steamid: "STEAM_0:0:00000"
        }
        const target: LogEntryUser = {
            name: "Target User",
            steamid: "STEAM_1:1:11111"
        }
        const msg = `${formatUser(client)} did something to ${formatUser(target)}`
        client.steamid = "STEAM_3:3:33333" // do not match
        const { parts, lPieceCount } = parseLogMessage(msg, client, target)

        expect(lPieceCount, "2 matches").toBe(2)
        expect(parts.length).toBe(3)

        expect(parts[0].type, "first part").toBe("client")
        expect(parts[0].user!.steamid, "first part").toBe("STEAM_0:0:00000")

        expect(parts[2].type, "last part").toBe("target")
        expect(parts[2].user!.steamid, "first part").toBe("STEAM_1:1:11111")
    })

    test("text before lpieces", () => {
         const client: LogEntryUser = {
            name: "Client User",
            steamid: "STEAM_0:0:00000"
        }
        const target: LogEntryUser = {
            name: "Target User",
            steamid: "STEAM_1:1:11111"
        }
        const msg = `Prefix ${formatUser(client)} Middle ${formatUser(target)}`
        const { parts, lPieceCount } = parseLogMessage(msg, client, target)

        expect(lPieceCount, "2 matches").toBe(2)
        expect(parts.length, "4 parts").toBe(4)

        expect(parts[0].content).toBe(" Prefix ") // space added due to bad logging messages
        expect(parts[1].type).toBe("client")
        expect(parts[2].content).toBe(" Middle ")
    })

    test("text after lpieces", () => {
         const client: LogEntryUser = {
            name: "Client User",
            steamid: "STEAM_0:0:00000"
        }
        const target: LogEntryUser = {
            name: "Target User",
            steamid: "STEAM_1:1:11111"
        }
        const msg = `${formatUser(client)} Middle ${formatUser(target)} Suffix`
        const { parts, lPieceCount } = parseLogMessage(msg, client, target)

        expect(lPieceCount, "2 matches").toBe(2)
        expect(parts.length, "4 parts").toBe(4)

        expect(parts[0].type).toBe("client")
        expect(parts[1].content).toBe(" Middle ")
        expect(parts[3].content).toBe(" Suffix")
    })
})


