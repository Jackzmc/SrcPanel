
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

export interface APINotesResponse {
  totalNotes: number,
  notesCount: number,
  notes: Note[]
}
export interface APIListUserNotes {
    notes: Note[]
}

export interface APICreateNoteResponse {
  /** ID of new note */
  id: number
}