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

export const CreateNoteBodySchema = Type.Object({
    content: Type.String(),
    steamid: Type.String()
})

export const UpdateNoteBodySchema = Type.Object({
    content: Type.String()
})


export type APICreateNoteRequest = Static<typeof CreateNoteBodySchema>
export type APIUpdateNoteRequest = Static<typeof UpdateNoteBodySchema>


/// PARAMS SCHEMA

export const NoteParamsSchema = Type.Object({
    id: Type.Number()
})

export type APINoteParams = Static<typeof NoteParamsSchema>