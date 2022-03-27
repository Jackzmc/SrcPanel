import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    
    fastify.get('/', async(req: FastifyRequest<{ Params: { id: string }}>, reply) => {
        const [notes] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT notes.*, u.last_alias as user, e.last_alias as executor, !b.expired as banned 
            FROM notes 
            LEFT JOIN stats_users as u ON notes.steamid = u.steamid 
            LEFT JOIN stats_users as e ON notes.markedBy = e.steamid 
            LEFT JOIN bans as b ON notes.steamid = b.steamid 
            ORDER BY notes.id DESC`,
            []
        )

        return {
            notes: notes.map(note => {
                return formatNote(note)
            })
        }
    })

    fastify.route({
        url: '/user/:steamid', 
        method: 'GET',
        schema: {
            params: {
                id: {
                    steamid: 'string'
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        notes: { type: ['array'] }
                    }
                }
            }
        },
        async handler(req: FastifyRequest<{ 
            Params: { steamid: string }
        }>, reply) {
            const [notes] = await fastify.db.execute<RowDataPacket[]>(
                `SELECT notes.*, u.last_alias as user, e.last_alias as executor, !b.expired as banned 
                FROM notes 
                LEFT JOIN stats_users as u ON notes.steamid = u.steamid 
                LEFT JOIN stats_users as e ON notes.markedBy = e.steamid 
                LEFT JOIN bans as b ON notes.steamid = b.steamid 
                WHERE notes.steamid = ?
                ORDER BY notes.id DESC`,
                [req.params.steamid]
            )

            return {
                notes: notes.map(note => {
                    return formatNote(note)
                })
            }
        }
    })

    fastify.route({
        url: '/admins/:steamid', 
        method: 'GET',
        schema: {
            params: {
                id: {
                    steamid: 'string'
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        notes: { type: ['array'] }
                    }
                }
            }
        },
        async handler(req: FastifyRequest<{ 
            Params: { steamid: string }
        }>, reply) {
            const [notes] = await fastify.db.execute<RowDataPacket[]>(
                `SELECT notes.*, u.last_alias as user, e.last_alias as executor, !b.expired as banned 
                FROM notes 
                LEFT JOIN stats_users as u ON notes.steamid = u.steamid 
                LEFT JOIN stats_users as e ON notes.markedBy = e.steamid 
                LEFT JOIN bans as b ON notes.steamid = b.steamid 
                WHERE notes.markedBy = ?
                ORDER BY notes.id DESC`,
                [req.params.steamid]
            )

            return {
                notes: notes.map(note => {
                    return formatNote(note)
                })
            }
        }
    })

    fastify.route({
        url: '/:id', 
        method: 'GET',
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
                        note: { type: ['object','null'] }
                    }
                }
            }
        },
        async handler(req: FastifyRequest<{ 
            Params: { id: number }
        }>, reply) {
            const [notes] = await fastify.db.execute<RowDataPacket[]>(
                `SELECT notes.*, u.last_alias as user, e.last_alias as executor, !b.expired as banned 
                FROM notes 
                LEFT JOIN stats_users as u ON notes.steamid = u.steamid 
                LEFT JOIN stats_users as e ON notes.markedBy = e.steamid 
                LEFT JOIN bans as b ON notes.steamid = b.steamid 
                WHERE id = ?
                ORDER BY notes.id DESC`,
                [req.params.id]
            )

            return {
                note: notes.length > 0 ? formatNote(notes[0]) : null
            }
        }
    })

    function formatNote(note) {
        return {
            id: note.id,
            content: note.content,
            client: {
                id: note.steamid,
                name: note.user,
            },
            markedBy: {
                id: note.markedBy,
                name: note.executor
            },
            banned: note.banned == 1
        }
    }
}