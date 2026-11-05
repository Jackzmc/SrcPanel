import Type, { type Static } from "typebox";

const STEAMID_REGEX = new RegExp(/STEAM_[01]:[01]:\d{2,}/)

export const STEAMID_TYPE = Type.String({ pattern: STEAMID_REGEX, title: 'SteamID2' })

export const SteamIdParams = Type.Object({
    steamid: STEAMID_TYPE
})

export type APISteamIdParams = Static<typeof SteamIdParams>