export interface LogEntryUser {
  steamid: string | null,
  name: string,
  avatarUrl?: string
}

type PieceType = "client" | "target" | "none" | "unknown" | "variable"
export interface LogMessagePart {
  content: string,
  user?: { name: string, steamid: string | null },
  type: PieceType,
  isBold?: boolean
}

// "NAME<USERID><STEAMID><CONSOLE>". Either "Name<##><STEAM_#:#:#######><>" or if console "Console<0><Console><Console>"
// Here we consider any of these as an "L Piece"
const SM_ACTION_REGEX = new RegExp(/"([^"<>]+)<\d+><(STEAM_\d:\d:\d+|Console|BOT)><(Console)?>"/);

const METADATA_VAR_REGEX = new RegExp(/%([a-zA-Z_]+)%/)

/**
 * Iterates all given regexes and returns the regex & match that comes first
 * @param content the content to match against
 * @param regexes list of regexes to match
 * @returns if at least one matches, the regex and its match
 */
function findFirstMatch(content: string, regexes: RegExp[]) {
  let lowestIndex = Infinity, chosen
  for (const regex of regexes) {
    const match = content.match(regex)
    if (match && match.index! <= lowestIndex) {
      lowestIndex = match.index!
      chosen = {
        regex,
        match
      }
    }
  }
  return chosen
}

/**
 * Splits a message into pieces, including normal text, upto 1 client, and 1 target piece
 * @param msg the raw message to parse and split
 * @param highlightRegex if provided and matches, replaces whatever with <b>$1</b>
 * @returns
 */
function splitLogMessage(msg: string, highlightRegex?: RegExp): LogMessagePart[] {
  const pieces: LogMessagePart[] = [];

  let index = 0;

  function addPiece(content: string, type: PieceType = "none", user?: LogEntryUser) {
    pieces.push({
      type,
      content,
      user,
    })
  }

  while (index <= msg.length) {
    // Find first match
    const result = findFirstMatch(msg.slice(index), [SM_ACTION_REGEX, METADATA_VAR_REGEX])
    if (!result) break
    const { match, regex } = result

    // If anything before match, add to parts
    let prevSlice: string = msg.slice(index, index + match.index!)
    if (prevSlice.length > 0) {
      // Add an extra spacing to fix some bad log messages
      if (prevSlice[0] !== " ") prevSlice = " " + prevSlice
      if (highlightRegex) prevSlice = prevSlice.replace(highlightRegex, "<b>$1</b>")

      addPiece(prevSlice)
    }

    if (regex == SM_ACTION_REGEX) {
      const [content, name, steamid] = result.match as [string, string, string | null]

      const user: LogEntryUser = {
        name,
        steamid
      }
      addPiece(content, "unknown", user)
    } else if (regex == METADATA_VAR_REGEX) {
      const [_, variableName] = result.match as [string, string]
      addPiece(variableName, "variable")
    }

    // Skip what we matched for next iteration
    index += match.index! + match[0].length
  }

  // If anything remains after all matches add it
  if (index < msg.length) {
    let message = msg.slice(index)
    if (highlightRegex) message = message.replace(highlightRegex, "<b>$1</b>")
    pieces.push({ content: message, type: "none" });
  }

  return pieces
}

const enum PieceTypeState {
  /** no client or target was attached */
  None,
  /** a client or target was attached */
  ShouldHave,
  /** client/target was attached and we found a match */
  Found
}

/**
 * Attempts to resolve users to LPiece parts by steamid or a guess
 * @param parts parts to modify
 * @param client client of action
 * @param target target of action
 * @returns number of LPieces
 */
function resolveUserParts(parts: LogMessagePart[], client?: LogEntryUser, target?: LogEntryUser): number {
  let lPieceCount = 0

  // in 90% of cases, we should have client and target steamids match and everythings good
  // in some cases, we have a BOT and have to guess
  // in the worst cases, steam auth issues means no steamids, so we are blind to guess

  let clientState: PieceTypeState = client != undefined ? PieceTypeState.ShouldHave : PieceTypeState.None
  let targetState: PieceTypeState = target != undefined ? PieceTypeState.ShouldHave : PieceTypeState.None

  function markPart(part: LogMessagePart, type: "client" | "target", user?: LogEntryUser) {
    part.type = type
    if (user) part.user!.name = user.name
    lPieceCount++
    if (type === "client") clientState = PieceTypeState.Found
    else if (type === "target") targetState = PieceTypeState.Found
  }

  // Resolve the parts we can guarentee
  for (const part of parts) {
    if (part.type !== "unknown" || !part.user) continue
    // Update name with the latest name and mark the type
    if (part.user.steamid === client?.steamid) {
      markPart(part, "client", client)
      clientState = PieceTypeState.Found // to quite TS being buggy
    } else if (part.user.steamid === target?.steamid) {
      markPart(part, "target", target)
      targetState = PieceTypeState.Found // to quite TS being buggy
    }
  }

  const unknownParts = parts.filter(part => part.type === "unknown")

  // Try a best guess of client and target
  if (unknownParts.length > 0) {
    // Easy: things we know 98% sure. if one found but not other
    if (clientState === PieceTypeState.ShouldHave && targetState === PieceTypeState.Found) {
      unknownParts.forEach(part => markPart(part, "client", client!)) // we know for certain client exists (enum derived from)
    } else if (clientState === PieceTypeState.Found && targetState === PieceTypeState.ShouldHave) {
      unknownParts.forEach(part => markPart(part, "target", target!)) // we know for certain target exists (enum derived from)
    }
    // Easy: same as above, but for bots
    else if (unknownParts[0]!.user?.steamid === "BOT") {
      if (clientState === PieceTypeState.Found) markPart(unknownParts[0]!, "target", target)
      else if (targetState === PieceTypeState.Found) markPart(unknownParts[0]!, "client", client)
      // We gonna hope that its <CLIENT> did X, rather than <TARGET> had this:
      else markPart(unknownParts[0]!, "client", client)
    }

    // Most likely 2 LPieces from here (but could if someone forgot to pass a client or target)
    else if (clientState === PieceTypeState.ShouldHave && targetState === PieceTypeState.ShouldHave) {
      // Make a guess that in majority of cases its <CLIENT> did <TARGET> not other way around
      for (const part of unknownParts) {
        if (clientState === PieceTypeState.ShouldHave) markPart(part, "client", client!)
        else markPart(part, "target", target!)
      }
    } else if (unknownParts.length == 2) {
      // Lastly, if it's 2 bots that remain, do same as above
      markPart(unknownParts[0]!, "client", client)
      markPart(unknownParts[1]!, "target", target)
    }
  }

  return lPieceCount
}

export function parseLogMessage(msg: string, client?: LogEntryUser, target?: LogEntryUser, highlightRegex?: RegExp): { parts: LogMessagePart[], lPieceCount: number } {
  const parts = splitLogMessage(msg, highlightRegex)

  const lPieceCount = resolveUserParts(parts, client, target)

  return {
    parts,
    lPieceCount
  }
}
