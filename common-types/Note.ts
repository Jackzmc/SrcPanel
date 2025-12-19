
export interface Note {
    id: number,
    content: string,
    client: NoteUser,
    createdAt: number,
    markedBy: NoteUser,
    banned: boolean
    action?: string[]
}
export interface NoteUser {
    id: string,
    name?: string,
    isAdmin?: boolean,
    avatarUrl?: string
}