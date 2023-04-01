import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { Action, Service } from '../../../../common-types/Privileges.js';

const PUTNotes = Type.Object({
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


            await req.user.log(note.steamid, `%client% edited note #%id% for %target%`, {
                service: Service.Notes,
                action: Action.Edit,
                metadata: {
                    id: note.id,
                    content: req.body.content,
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

            await req.user.log(existing[0].client, `%client% deleted note #%id% for %target%`, {
                service: Service.Notes,
                action: Action.Delete,
                metadata: {
                    id: req.params.id
                }
            })

            return {
                changes: ok.affectedRows,
                note: existing[0]
            }
        }
    })
}