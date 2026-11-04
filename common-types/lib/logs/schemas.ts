import { Type, type Static } from "@sinclair/typebox";

export const FetchLogsQuerySchema = Type.Object({
  servers: Type.Optional(Type.Array(Type.String())),
  types: Type.Optional(Type.Array(Type.String())),
  searchClient: Type.Optional(Type.String()),
  searchTarget: Type.Optional(Type.String()),
  searchMessage: Type.Optional(Type.String()),
  aroundId: Type.Optional(Type.Integer()),
  /** Number of items to fetch */
  limit: Type.Optional(Type.Integer()),
  /** A specific year to fetch logs for. Defaults to current year */
  year: Type.Optional(Type.Number()),
})

export const FetchLogsParamsSchema = Type.Object({
    type: Type.String(),
    id: Type.Number()
})

export type APIFetchLogsQuery = Static<typeof FetchLogsQuerySchema>
export type APIFetchLogsParams = Static<typeof FetchLogsParamsSchema>