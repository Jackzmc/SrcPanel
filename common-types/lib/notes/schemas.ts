import { Type, type Static } from "@sinclair/typebox";

/// QUERY SCHEMA

export const ListNotesQuerySchema = Type.Object({
    limit: Type.Optional(Type.Number()),
    page: Type.Optional(Type.Number()),
    search_content: Type.Optional(Type.String()),
    search_user: Type.Optional(Type.String())
})

export type APIListNotesQuery = Static<typeof ListNotesQuerySchema>

/// BODY SCHEMA

export const CreateEditNoteBodySchema = Type.Object({
    content: Type.String()
})


export type APICreateNoteRequest = Static<typeof CreateEditNoteBodySchema>
export type APIUpdateNoteRequest = Static<typeof CreateEditNoteBodySchema>


/// PARAMS SCHEMA

export const NoteParamsSchema = Type.Object({
    id: Type.Number()
})

export type APINoteParams = Static<typeof NoteParamsSchema>