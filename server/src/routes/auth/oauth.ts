import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import crypto, { createHash } from 'node:crypto'
import User from '../../modules/users/User.js';
import SteamID from 'steamid';
import { ErrorWithCode } from '../../util.js';
import { sendMetric } from '../../modules/metrics/influx.js';
import { METRIC_AUTH_LOGIN_COUNT } from '../../core/prom-metrics.js';
import { GUARD_REQUIRE_LOGGED_IN, GUARD_REQUIRE_OAUTH_PROVIDER } from '../../guards/auth.js';
import { OauthProviderId } from '@srcpanel/common/User';
import CacheManager from '../../modules/CacheManager.js';

const RouteError = ErrorWithCode

interface StateData {
    providerId: string,
    /** steam user being linked to */
    userId?: string,
}

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    const loginLinkHandler = async (req, reply) => {
        const provider = GUARD_REQUIRE_OAUTH_PROVIDER.get(req)
        const isLink = req.url.endsWith("/link")
        reply.type("text/html")
        const redirectUri = await getRedirectUri(provider.config.name)
        if(!provider || !redirectUri) {
            throw new RouteError("PROVIDER_NOT_SUPPORTED", "Login provider is not configured and cannot be used")
        }
        const params = new URLSearchParams({
            client_id: provider.config.client_id,
            scope: "identify",
            response_type: "code",
            redirect_uri: redirectUri,
            state: await generateState(isLink ? req.user : null)
        })
        return reply.redirect(`${provider.config.authorize_url}?${params.toString()}`)
    }
    ["/login", "/link"].forEach(url => fastify.get.bind(fastify)(
        url, 
        { preHandler: [
            GUARD_REQUIRE_OAUTH_PROVIDER.prehandler()
        ]},
        loginLinkHandler 
    ))

    fastify.get(
        '/:provider/revoke', 
        { preHandler: [ 
            GUARD_REQUIRE_LOGGED_IN.prehandler(),
            GUARD_REQUIRE_OAUTH_PROVIDER.prehandler() 
        ]},
        async (req: FastifyRequest<{ Querystring: { json?: boolean }}>, reply) => {
            const provider = GUARD_REQUIRE_OAUTH_PROVIDER.get(req)
            if(!req.query.json)
                reply.type("text/html")
            await req.user!.removeProvider(provider.config.name as OauthProviderId)
            return req.query.json 
                ? reply.status(204).send() 
                : reply.send(`<h1> OAuth provider "${provider.config.name}" has been revoked</h1>`)
        }
    )


    fastify.get(
        '/:provider/callback', 
        { preHandler: [ 
            GUARD_REQUIRE_OAUTH_PROVIDER.prehandler() 
        ]},
        async (
            req: FastifyRequest<{ Querystring: { code: string, state: string, json?: boolean, return_uri?: string }}>, 
            reply
        ) => {
            const provider = GUARD_REQUIRE_OAUTH_PROVIDER.get(req)
            
            reply.type("text/html")
            if(!req.query.code) return reply.send("<h1>Missing code</h1>")
            if(!req.query.state) return reply.send("<h1>Missing state</h1>")

            const domain = fastify.config.Domain;
            if(!domain) {
                req.log.error({ provider: provider.config.name }, "missing DOMAIN config key for oauth support")
                throw new RouteError("PROVIDER_ERROR_NO_DOMAIN", "Login provider is not configured correctly and cannot be used")
            }
            // this route - /api/auth/callback
            const redirectUri = await getRedirectUri(provider.config.name) as string

            const data = await verifyState(req.query.state)

            // where to return user
            const returnUrl = req.query.return_uri ? `${domain}${req.query.return_uri}` : domain
            // Converts code into access token
            await provider.user.authorizeWithCode(req.query.code, redirectUri)
            // We have an access token, so we can fetch details
            const userInfo = await provider.user.fetchDetails()
            if(data.userId) {
                // User is logged in already, is linking provider
                await provider.user.save(req.user!.steamid2)

                await req.user!.notify(`${provider.config.name} account ${userInfo!.username} has been linked successfully.`)
                await reply.redirect(returnUrl, 302)
            } else {
                // User is logging in to their account via provider
                // We need to find their steam account
                const admin = await fastify.authmngr.getAdminByProvider(provider.config.name as OauthProviderId, userInfo!.id)
                if(!admin) throw new RouteError("NO_ACCOUNT_FOUND", `No steam account is linked to this ${provider.config.name} account. A steam account must be linked to login with ${provider.config.name}`)

                // We need to refresh steam info as well
                const details = await fastify.steam.getUserDetail(new SteamID(admin.steamid))
                await provider.user.save(admin.steamid)
                await fastify.authmngr.loginUser(req, reply, admin, details)
                sendMetric(`oauth_${provider.config.name}_login`, 1)
                METRIC_AUTH_LOGIN_COUNT.inc({ source: provider.config.name })
                await reply.redirect(returnUrl, 302)
            }
        }
    )

    async function getRedirectUri(providerId: string) {
        const domain = fastify.config.Domain
        if(!domain) return null
        return `${domain}/api/auth/oauth/${providerId}/callback`
    }

    async function generateState(providerId: string, user?: User): Promise<string> {
        const state = crypto.randomBytes(32).toString('base64url');
        const hashed = createHash('sha256').update(state).digest('base64');
        const data: StateData = {
            providerId,
            userId: user?.steamid2
        }
        await CacheManager.instance.set(
            `oauth:state:${hashed}`,
            JSON.stringify(data),
            { ttl: 60 }
        );
        return state
    }

    async function verifyState(state: string): Promise<StateData> {
        const hashed = createHash('sha256').update(state).digest('base64');
        const key = `oauth:state:${hashed}`
        const data = await CacheManager.instance.get<StateData>(key)
        if(!data) throw new Error("Invalid oauth state") 
        await CacheManager.instance.delete(key)
        return data
    }
}