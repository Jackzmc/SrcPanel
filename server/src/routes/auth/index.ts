import { SessionStore } from '@fastify/session';
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { SessionData, UserData } from '../../../../common-types/User';
import { SESSION_VERSION } from './steam.js';


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.addHook('preHandler', async(req, reply) => {
        await fastify.authmngr.verify(req, reply)
    })
    
    fastify.get('/profile', async(req, reply): Promise<UserData> => {
        return {
            user: req.session.user,
            permissions: req.session.permissions,
            isSessionOld: req.session.version !== SESSION_VERSION,
            providers: await req.user.getProviders(),
        }
    })

    fastify.delete('/sessions/:id', async(req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const [sessions] = await fastify.db.query<RowDataPacket[]>(
            `SELECT session_id 
            FROM dash_sessions
            WHERE session_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.user.accountid')) = ?`,
            [req.params.id, req.session.user.accountid]
        )
        if(sessions.length == 0) {
            return reply.code(404).send({
                error: 'NO_SESSION',
                message: 'No session found'
            })
        } else {
            try {
                await deleteSession(req.sessionStore, req.session.sessionId)
                reply.code(204).send()
            } catch(err) {
                return reply.code(500).send({
                    error: "INTERNAL_SERVER_ERROR",
                    message: err.message
                })
            }
        }
    })

    fastify.get('/sessions', async(req, reply) => {
        const sessions = await req.user.getSessions()

        return { 
            sessions: sessions.map(session => { 
                const data: SessionData = {
                    id: session.id,
                    ip: session.ip,
                    loginTime: session.loginTime,
                    lastActive: session.lastActive,
                    countryCode: session.countryCode,
                }
                return data
            }), 
            currentSessionId: req.session.sessionId
        }
    })

    fastify.get('/logout', async (req, reply) => {
        await req.session.destroy()
        reply.code(204).send()
        req.sessionStore
    })

    async function deleteSession(sessionStore: SessionStore, sessionId: string) {
        return new Promise((resolve, reject) => {
            sessionStore.destroy(sessionId, (err) => {
                if(err) return reject(err)
                else resolve(true)
            })
        })
    }
}
