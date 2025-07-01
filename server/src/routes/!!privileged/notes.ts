import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { NO_PERMISSION } from '../../responses.js';

const POSTNotes = Type.Object({
    content: Type.String(),
});

type POSTNotesType = Static<typeof POSTNotes>;

const PUTNotes = Type.Object({
    markedBy: Type.String(),
    content: Type.String(),
});

type PUTNotesType = Static<typeof PUTNotes>;

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.route({
        url: '/:steamid', 
        method: 'POST',
        schema: {
            body: {
                type: 'object',
                properties: {
                    content: { type: 'string' },
                    steamid: { type: 'string' },
                }
            }
        },
        async handler(req: FastifyRequest<{ Body: POSTNotesType, Params: { steamid: string } }>, reply) {
            if(!req.user!.hasPermission("notes.create")) return NO_PERMISSION(reply)
            const [ok] = await fastify.db.execute<OkPacket>(`
                INSERT INTO notes (steamid, markedBy, content)
                VALUES (:steamid, :markedBy, :content)`,
                {
                    content: req.body.content,
                    steamid: req.params.steamid,
                    markedBy: req.user!.steamid2
                }
            )


            await req.user!.log(req.params.steamid, `%client% created note #%id% for %target%`, {
                code: "notes.create",
                metadata: {
                    id: ok.insertId,
                    content: req.body.content,
                }
            })

            return {
                id: ok.insertId,
            }
        }
    })

    fastify.route({
        url: '/:id', 
        method: 'PUT',
        schema: {
            body: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    content: { type: 'string' },
                    markedBy: { type: 'string' },
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        changes: { type: 'number' },
                    }
                }
            }
        },
        async handler(req: FastifyRequest<{ Body: PUTNotesType, Params: { id: string } }>, reply) {
            if(!req.user!.hasPermission("notes.edit")) return NO_PERMISSION(reply)
            const [existing] = await fastify.db.execute<RowDataPacket[]>(`
                SELECT * FROM notes WHERE id = ?`,
                [req.params.id]
            )

            if(existing.length === 0) {
                return reply.code(404).send({
                    error: 'NOT_FOUND',
                    message: 'Note not found',
                    statusCode: 404
                })
            }

            // Check if they can edit this
            const isCreator = req.user!.equals(existing[0].markedBy) 
            const [code, granted] = req.user!.requirePermission("notes.edit", {isCreator})
            if(!granted) return NO_PERMISSION(reply)

            const note: any = {
                ...existing[0],
                ...req.body
            }


            const [ok] = await fastify.db.execute<OkPacket>(`
                UPDATE notes
                SET content = :content, markedBy = :markedBy
                WHERE id = :id`,
                note
            )


            await req.user!.log(note.steamid, `%client% edited note #%id% for %target%`, {
                code,
                metadata: {
                    id: note.id,
                    oldContent: existing[0].content,
                    newContent: req.body.content,
                    markedBy: req.body.markedBy
                }
            })

            return {
                changes: ok.affectedRows
            }
        }
    })

    fastify.route({
        url: '/:id', 
        method: 'DELETE',
        schema: {
            params: {
                type: "object",
                properties: {
                    id: {
                        type: 'number'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        changes: { type: 'number' },
                        note: { type: 'object' }
                    }
                }
            }
        },
        async handler(req: FastifyRequest<{ 
            Params: { id: number }
        }>, reply) {
            if(!req.user!.hasPermission("notes.delete")) return NO_PERMISSION(reply)
            const [existing] = await fastify.db.execute<RowDataPacket[]>(`
                SELECT * FROM notes WHERE id = ?`,
                [req.params.id]
            )

            if(existing.length === 0) {
                return reply.code(404).send({
                    error: 'NOT_FOUND',
                    message: 'Note not found',
                    statusCode: 404
                })
            }

            // Check if they can edit this
            const isCreator = req.user!.equals(existing[0].markedBy) 
            const [code, granted] = req.user!.requirePermission("notes.delete", {isCreator})
            if(!granted) return NO_PERMISSION(reply)

            const [ok] = await fastify.db.execute<OkPacket>(
                `DELETE FROM notes WHERE id = ?`,
                [req.params.id]
            )

            await req.user!.log(existing[0].steamid, `%client% deleted note #%id% for %target%`, {
                code,
                metadata: {
                    id: req.params.id,
                    markedBy: existing[0].markedBy,
                    content: existing[0].content
                }
            })

            return {
                changes: ok.affectedRows,
                note: existing[0]
            }
        }
    })
}