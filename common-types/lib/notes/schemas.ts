import { Type, type Static } from "@sinclair/typebox";

export const CreateEditNoteBodySchema = Type.Object({
    content: Type.String()
})

export type APICreateNoteRequest = Static<typeof CreateEditNoteBodySchema>
export type APIUpdateNoteRequest = Static<typeof CreateEditNoteBodySchema>

export const NoteParamsSchema = Type.Object({
    id: Type.Number()
})

export type APINoteParams = Static<typeof NoteParamsSchema>