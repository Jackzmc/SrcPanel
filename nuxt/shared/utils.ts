export function isSteamIdSame(a: string, b: string) {
    return a === b || a.substring(11) == b.substring(11)
}