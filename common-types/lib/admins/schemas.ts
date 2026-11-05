import Type, { type Static } from "typebox"

export const GrantAdminBodySchema = Type.Object({
  immunityLevel: Type.Number(),
  flags: Type.String(),
  groupIds: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  webCodes: Type.Optional(Type.Array(Type.String())),
})

export const EditAdminBodySchema = Type.Object({
  immunityLevel: Type.Optional(Type.Number()),
  flags: Type.Optional(Type.String()),
  groupIds: Type.Optional(Type.String()),
  webCodes: Type.Optional(Type.Array(Type.String())),
  name: Type.Optional(Type.String())
})

export type APIGrantAdminRequest = Static<typeof GrantAdminBodySchema>
export type APIEditAdminRequest = Static<typeof EditAdminBodySchema>