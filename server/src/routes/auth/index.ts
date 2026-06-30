import type { SessionStore } from '@fastify/session';
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import type { APIConnections, APISessionList, ProviderConnectionData, SessionData, UserData } from '@srcpanel/common/User';
import type { UserPrivilegeCode } from '@srcpanel/common/Privileges';
import { TABLE_PREFIX } from '../../middlewares/managers.js';


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    // Ensure user is authenticated, thus req.user is defined
    fastify.addHook('preHandler', async(req, reply) => {
        await fastify.authmngr.verify(req, reply)
    })

    fastify.delete('/notifications', async(req, reply) => {
        await req.user!.clearNotifications()
        return reply.status(204).send()
    })

    fastify.get('/notifications/sse', async(req, reply) => {
        reply.raw.writeHead(200, {
            'Cache-Control': 'no-cache,no-transform',
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        reply.raw.flushHeaders()
        reply.raw.write('retry: 10000\n\n')
        // Send keep alive comments to prevent client from disconnecting
        const keepAliveTimer = setInterval(() => {
            reply.raw.write(': keepalive\n\n')
        }, 1000 * 30)

        function sendSSE(payload: any) {
            return reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`)
        }

        // Send any previous notifications
        const notifications = await req.user!.getNotifications()
        for(const notification of notifications) {
            sendSSE(notification)
        }
        

        fastify.authmngr.subscribeNotifications(req.user!.steamid2, sendSSE)

        reply.raw.on("close", () => {
            clearInterval(keepAliveTimer)
            fastify.authmngr.unsubscribeNotifications(sendSSE)
        })
    })

    fastify.get('/profile', async(req, reply): Promise<UserData<UserPrivilegeCode[]>> => {
        const profile = await fastify.authmngr.getProfileData(req.user!.steamid2)
        return {
            profile,
            user: req.session.user,
            permissions: req.session.permissions,
            providers: req.user!.providers!, // TODO: is this needed?
            notifications: [],
            openDiscussions: await req.user!.getOpenDiscussionsCount(),
            impersonatingId: req.session.impersonate ? req.session.user.steamid : undefined
        }
    })

    fastify.get('/connections', async(req, reply): Promise<APIConnections> => {
        // Forces all providers to refetch user data, to ensure it's up to date.
        if(!req.user) throw new Error("Missing user")
        await req.user.updateProviders()
        const providerList = await fastify.authmngr.oauth.getProviders()
        const providers: Record<string, ProviderConnectionData> = {}
        for(const provider of providerList) {
            // Check if user has such provider setup
            if(req.user.providers![provider.id] !== undefined) {
                providers[provider.id] = {
                    id: provider.id,
                    name: provider.name ?? provider.id,
                    enabled: true,
                    data: req.user!.providers![provider.id],
                    expired: req.user!.providers![provider.id] === null
                }
            } else {
                providers[provider.id] = {
                    id: provider.id,
                    name: provider.name ?? provider.id,
                    enabled: false
                }
            }
        }
        return providers
    })

    fastify.delete('/sessions/:id', async(req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const [sessions] = await fastify.db.query<RowDataPacket[]>(
            `SELECT session_id 
            FROM ${TABLE_PREFIX}_sessions
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
            } catch(err: any) {
                return reply.code(500).send({
                    error: "INTERNAL_SERVER_ERROR",
                    message: err.message
                })
            }
        }
    })

    fastify.get('/sessions', async(req, reply): Promise<APISessionList> => {
        const sessions = await req.user!.getSessions()

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
