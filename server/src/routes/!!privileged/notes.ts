import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'

const PUTNotes = Type.Object({
    id: Type.Integer(),
    // steamid: Type.String(),
    markedBy: Type.String(),
    content: Type.String(),
});

type PUTNotesType = Static<typeof PUTNotes>;

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    
    fastify.route({
        url: '/:id', 
        method: 'PUT',
        schema: {
            body: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'id'
                ],
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
        async handler(req: FastifyRequest<{ Body: PUTNotesType }>, reply) {
            const [existing] = await fastify.db.execute<RowDataPacket[]>(`
                SELECT * FROM notes WHERE id = ?`,
                [req.body.id]
            )

            if(existing.length === 0) {
                return reply.code(404).send({
                    error: 'NOT_FOUND',
                    message: 'Note not found',
                    statusCode: 404
                })
            }

            const note = {
                ...existing[0],
                ...req.body
            }

            const [ok] = await fastify.db.execute<OkPacket>(`
                UPDATE notes
                SET content = :content, markedBy = :markedBy
                WHERE id = :id`,
                note
            )

            fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'NOTE_EDIT', `Updated note ${note.id} for ${existing[0].steamid}`)

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
                id: {
                    type: 'number'
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

            const [ok] = await fastify.db.execute<OkPacket>(
                `DELETE FROM notes WHERE id = ?`,
                [req.params.id]
            )

            fastify.authmngr.log.addWebEntry(req.session.user.steamid, 'NOTE_DELETE', `Deleted note ${req.params.id} for ${existing[0].steamid}`)

            return {
                changes: ok.affectedRows,
                note: existing[0]
            }
        }
    })
}