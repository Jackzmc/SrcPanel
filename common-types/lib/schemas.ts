import Type, { type Static } from "typebox";

export const STEAMID_TYPE = Type.String({ pattern: "STEAM_[01]:[01]:\d{2,}", title: 'SteamID2' })

export const SteamIdParams = Type.Object({
    steamid: STEAMID_TYPE
})

export type APISteamIdParams = Static<typeof SteamIdParams>