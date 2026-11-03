import { Static, Type } from '@sinclair/typebox';

export const CreateDiscussionSchema = Type.Object({
  title: Type.String(),
  description: Type.Optional(Type.String()),
  closedAt: Type.Optional(Type.Integer()),
  flags: Type.Optional(Type.Integer()),
  type: Type.Union([Type.Integer(), Type.String()]),
  options: Type.Array(Type.Object({
    label: Type.String()
  }))
})

export const EditDiscussionSchema = Type.Object({
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  closedAt: Type.Optional(Type.Integer()),
  flags: Type.Optional(Type.Integer()),
  type: Type.Optional(Type.Union([Type.Integer(), Type.String()])),
  options: Type.Optional(Type.Array(Type.Object({
    label: Type.String()
  })))
})

export const SubmitCommentSchema = Type.Object({
  content: Type.String()
})

export type APICreateDiscussionRequest = Static<typeof CreateDiscussionSchema>
export type APIEditDiscussionRequest = Static<typeof EditDiscussionSchema>
export type APISubmitCommentRequest = Static<typeof SubmitCommentSchema>