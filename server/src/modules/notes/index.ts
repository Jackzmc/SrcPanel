import { Note } from "@srcpanel/common/Note"

export function formatNote(note: any): Note {
    let action = undefined
    if (note.content.startsWith("@") && note.content.length > 1) {
      action = note.content.slice(1).split(".")
    }
    return {
      id: note.id,
      content: note.content,
      client: {
        id: note.steamid,
        name: note.user,
        isAdmin: note.targetIsAdmin == 1
      },
      markedBy: {
        id: note.markedBy,
        name: note.executor,
      },
      createdAt: note.createdAt,
      banned: note.banned == 1,
      action
    }
}