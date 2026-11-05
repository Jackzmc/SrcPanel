import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { NO_PERMISSION, NOT_FOUND } from '../../util/responses.js';
import { NamespacedMetric } from '../../modules/metrics/influx.js';
import { CreateNoteBodySchema, NoteParamsSchema, UpdateNoteBodySchema, type APICreateNoteRequest, type APINoteParams, type APIUpdateNoteRequest } from '@srcpanel/common/notes/schemas';
import * as NotesRepo from '#/modules/notes/NotesRepo.js'
import type { APINote } from '@srcpanel/common/Note';

const metric = new NamespacedMetric("notes")


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.post(
        '/:steamid',
        { schema: { body: CreateNoteBodySchema } },
        async (req: FastifyRequest<{ Body: APICreateNoteRequest, Params: { steamid: string } }>, reply) => {
            if(!req.user!.hasPermission("notes.create")) return NO_PERMISSION(reply)

            const id = await NotesRepo.createNote(fastify.db, req.params.steamid, req.user!.steamid2, req.body.content)

            metric.send("created", 1)
            await req.user!.log(req.params.steamid, `%client% created note #%id% for %target%`, {
                code: "notes.create",
                metadata: {
                    id,
                    content: req.body.content,
                }
            })

            return {
                id
            }
        }
    )

    fastify.put(
        '/:id',
        { schema: { body: UpdateNoteBodySchema, params: NoteParamsSchema }},
        async (req: FastifyRequest<{ Body: APIUpdateNoteRequest, Params: APINoteParams }>, reply) => {
            if(!req.user!.hasPermission("notes.edit")) return NO_PERMISSION(reply)

            const note = await NotesRepo.getNote(fastify.db, req.params.id)

            if(!note) {
                return NOT_FOUND(reply, "Note")
            }

            // Check if they can edit this
            const isCreator = req.user!.equals(note.markedBy.id) 
            const [code, granted] = req.user!.requirePermission("notes.edit", {isCreator})
            if(!granted) return NO_PERMISSION(reply)

            await NotesRepo.updateNote(fastify.db, note.id, req.body.content)
            

            metric.send("updated", 1)
            await req.user!.log(note.client.id, `%client% edited note #%id% for %target%`, {
                code,
                metadata: {
                    id: note.id,
                    oldContent: note.content,
                    newContent: req.body.content,
                }
            })

            return reply.status(204).send()
        }
    )

    fastify.delete(
        '/:id',
        { schema: { params: NoteParamsSchema }},
        async (req: FastifyRequest<{ Params: APINoteParams }>, reply) => {
            if(!req.user!.hasPermission("notes.delete")) return NO_PERMISSION(reply)

            const note = await NotesRepo.getNote(fastify.db, req.params.id)
            if(!note) {
                return NOT_FOUND(reply, "Note")
            }

            const isCreator = req.user!.equals(note.markedBy.id) 
            const [code, granted] = req.user!.requirePermission("notes.delete", {isCreator})
            if(!granted) return NO_PERMISSION(reply)

            await NotesRepo.deleteNote(fastify.db, req.params.id)

            await req.user!.log(note.client.id, `%client% deleted note #%id% for %target%`, {
                code,
                metadata: {
                    id: req.params.id,
                    markedBy: note.markedBy.id,
                    content: note.content
                }
            })

            return {
                note
            }
        }
    )
}