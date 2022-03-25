import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import SteamID from 'steamid'
import fetch from 'node-fetch'
import FastGeoip from 'fast-geoip'
import { OkPacket, RowDataPacket } from 'mysql2';


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.addHook('preHandler', async(req, reply) => {
        await fastify.authmngr.verify(req, reply)
    })

    function promiseDeleteSession(req: FastifyRequest, sessId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            req.sessionStore.destroy(sessId, (err: Error) => {
                if(err) return reject(err)
                resolve()
            })
        })
        
    }

    
    fastify.get('/profile', async(req, reply) => {
        return {
            user: req.session.user,
            permissions: req.session.permissions
        }
    })

    fastify.delete('/sessions/:id', async(req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const [sessions] = await fastify.db.query<RowDataPacket[]>(
            `SELECT session_id 
            FROM dash_sessions
            WHERE session_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.user.accountid')) = ?`,
            [req.params.id, req.session.user.accountid]
        )
            console.log(req.params.id, req.session.user.accountid, sessions)
        if(sessions.length == 0) {
            reply.code(404).send({
                error: 'NO_SESSION',
                message: 'No session found'
            })
        } else {
            await promiseDeleteSession(req, req.session.sessionId)
            console.log('deleted')
            reply.code(204).send()
            /*req.sessionStore.destroy(req.session.sessionId, (err: Error) => {
                if(err) throw err
                reply.code(204).send()
            })*/
            
            /*
            const [ok] = await fastify.db.query<OkPacket>("DELETE FROM dash_sessions WHERE session_id = ? LIMIT 1", [sessions[0].session_id])
            console.log('ok', ok)
            if(ok.affectedRows > 0)
                reply.code(204).send()
            else
                reply.code(500).send({
                    error: 'SESSION_NOT_TERMINATED',
                    code: "The session could not be terminated"
                })*/
        }
    })

    fastify.get('/sessions', async(req, reply) => {
        const [sessions] = await fastify.db.execute<RowDataPacket[]>(`
            SELECT session_id AS id, JSON_UNQUOTE(JSON_EXTRACT(data,'$.ip')) as ip, JSON_UNQUOTE(JSON_EXTRACT(data, '$.countryCode')) as countryCode, JSON_UNQUOTE(JSON_EXTRACT(data, '$.loginTime')) as lastLogin
            FROM dash_sessions 
            WHERE JSON_EXTRACT(data, '$.user.accountid') = ?`,
            [req.session.user.accountid]
        )

        return { sessions, currentSessionId: req.session.sessionId }
    })

    fastify.get('/logout', (req, reply) => {
        req.destroySession((err) => {
            if(err) throw err
            reply.code(204).send()
        })
    })
}