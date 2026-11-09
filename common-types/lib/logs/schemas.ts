import { Type, type Static } from "typebox";

export const FetchLogsQuerySchema = Type.Object({
  /** comma separated list */
  servers: Type.Optional(Type.String()),
  /** comma separated list */
  types: Type.Optional(Type.String()),
  search_client: Type.Optional(Type.String()),
  search_target: Type.Optional(Type.String()),
  search_message: Type.Optional(Type.String()),
  /** Number of items to fetch */
  limit: Type.Optional(Type.Integer()),
  /** A specific year to fetch logs for. Defaults to current year */
  year: Type.Optional(Type.Number()),
})

export const FetchLogsParamsSchema = Type.Object({
  type: Type.Enum(["before","after","around"], { title: "fetch direction", description: "'before' fetches before entry (inclusive), 'after' fetches after entry (exclusive), or around an id (id in the middle)" }),
  id: Type.Number()
})

export type APIFetchLogsQuery = Static<typeof FetchLogsQuerySchema>
export type APIFetchLogsParams = Static<typeof FetchLogsParamsSchema>