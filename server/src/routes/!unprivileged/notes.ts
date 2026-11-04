import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { APINotesResponse, type APIListUserNotes, type APINote } from '@srcpanel/common/Note';
import * as NotesRepo from '../../modules/notes/NotesRepo.js';
import { ListNotesQuerySchema, NoteParamsSchema, type APIListNotesQuery, type APINoteParams } from '@srcpanel/common/notes/schemas'
import { NOT_FOUND } from '../../util/responses.js';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.get(
    '/', 
    { schema: { querystring: ListNotesQuerySchema }},
    async (req: FastifyRequest<{ Querystring: APIListNotesQuery }>, reply): Promise<APINotesResponse> => { 
      const notes = await NotesRepo.getNotes(fastify.db, req.query)
      return {
        notes
      }
    }
  )

  fastify.get('/user/:steamid', async (req: FastifyRequest<{ Params: { steamid: string } }>, reply): Promise<APIListUserNotes> => {
    const notes = await NotesRepo.getNotesForPlayer(fastify.db, req.params.steamid)

    return { notes }
  })

  fastify.get(
    '/:id', 
    { schema: { params: NoteParamsSchema } },
    async(req: FastifyRequest<{ Params: APINoteParams }>, reply): Promise<{ note: APINote }> => {
      const note = await NotesRepo.getNote(fastify.db, req.params.id)
      if(!note) return NOT_FOUND(reply, "Note")
      return { note }
    }
  )
}
