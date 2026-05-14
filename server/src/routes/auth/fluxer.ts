import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import JWT from '../../jwt-promise.js'
import crypto from 'node:crypto'
import User from '../../modules/users/User.js';
import SteamID from 'steamid';
import { ErrorWithCode } from '../../util.js';
import { sendMetric } from 'modules/Influx.js';

interface StateJwtPayoad {
    seed: string,
    provider: string,
    pub?: string,
}

const STATE_SEED_LENGTH = Number(process.env.STATE_SEED_LENGTH) || 20
const STATE_JWT_SECRET = process.env.STATE_SECRET as string
const STATE_SEED = crypto.randomBytes(STATE_SEED_LENGTH).toString('hex')

const PROVIDER_NAME = "fluxer"
const RouteError = ErrorWithCode

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    // Disable discord support if no secret
    if(!process.env.STATE_SECRET) {
        fastify.get("*", async (req, reply) => {
            reply.type("text/html")
            const domain = fastify.config.Domain
            return reply.redirect(`${domain}/error?type=oauth_error&provider=${PROVIDER_NAME}&oauth_error=provider_not_supported`)
        })
    }
    else fastify.log.info(`[Oauth] Provider "${PROVIDER_NAME}" available`)

    fastify.setErrorHandler(async (err, req: FastifyRequest<{Querystring: Record<string, any> }>, reply: FastifyReply) => {
        let code: string = "INTERNAL_ERROR", message: string = ""
        /*if(err instanceof ProviderAPIError) {
            if(err.status == 429) {
                code = "STEAM_TEMPORARILY_UNAVAILABLE"
                message = "Steam API is temporarily unavailable (too many requests)"
            } else {
                code = "STEAM_API_ERROR"
                message = `Steam API returned an error (${err.status} ${err.statusText})`
            }
        } else {*/
            if(err.code) code = err.code
            message = err.message
        /*}*/
        fastify.log.error({
            errName: err.name,
            code,
            message
        }, `[auth/${PROVIDER_NAME}] route error`)
        const params = new URLSearchParams()
        params.append("type", "oauth_error")
        params.append("provider", PROVIDER_NAME)
        params.append("code", code)
        params.append("message", message)
        params.append("req_id", req.id)
        return reply.redirect(`${fastify.config.Domain ?? ''}/error?${params.toString()}`)
    })


    const loginLinkHandler = async (req, reply) => {
        const isLink = req.url.endsWith("/link")
        reply.type("text/html")
        const redirectUri = await getRedirectUri()
        const provider = fastify.config.GetProvider(PROVIDER_NAME)
        if(!provider || !redirectUri) {
            throw new RouteError("PROVIDER_NOT_SUPPORTED", "Login provider is not configured and cannot be used")
        }
        const params = new URLSearchParams({
            client_id: provider.client_id,
            scope: "identify",
            response_type: "code",
            redirect_uri: redirectUri,
            state: await generateState(isLink ? req.user : null)
        })
        return reply.redirect(`${provider.authorize_url}?${params.toString()}`)
    }
    ["/login", "/link"].forEach(url => fastify.get.bind(fastify)(url, loginLinkHandler))

    fastify.get('/revoke', async (req: FastifyRequest<{ Querystring: { json?: boolean }}>, reply) => {
        await fastify.authmngr.verify(req, reply)
        if(!req.query.json)
            reply.type("text/html")
        await req.user!.removeProvider(PROVIDER_NAME)
        return req.query.json ? reply.status(204).send() : reply.send("<h1>Discord has been revoked</h1>")
    })

    fastify.get('/callback', async (req: FastifyRequest<{ Querystring: { code: string, state: string, return_uri?: string }}>, reply) => {
        reply.type("text/html")
        if(!req.query.code) return reply.send("<h1>Missing code</h1>")
        if(!req.query.state) return reply.send("<h1>Missing state</h1>")
        const domain = fastify.config.Domain;
        if(!domain) return reply.code(500).send({
            error: "PROVIDER_SETUP_MISSING",
            message: "This provider is not setup correctly, missing 'domain' setting"
        })

        if(!domain) throw new RouteError("PROVIDER_ERROR_NO_DOMAIN", "Login provider is not configured correctly and cannot be used")
        // this route - /api/auth/callback
        const redirectUri = await getRedirectUri() as string
        const provider = await fastify.authmngr.oauth.getProvider(PROVIDER_NAME)
        if(!provider) {
            throw new RouteError("PROVIDER_NOT_SUPPORTED", "Provider is unknown or unsupported")
        }

        let jwt
        try {
          jwt = await JWT.verify<StateJwtPayoad>(req.query.state, STATE_JWT_SECRET)
        } catch(err) {
          throw new RouteError("STATE_EXPIRED", "Request has expired, please try again")
        }

        // where to return user
        const returnUrl = req.query.return_uri ? `${domain}${req.query.return_uri}` : domain
        // Converts code into access token
        await provider.authorizeWithCode(req.query.code, redirectUri)
        // We have an access token, so we can fetch details
        const userInfo = await provider.fetchDetails()
        if(jwt.payload.pub) {
            // User is logged in already, is linking provider
            await provider.save(req.user!.steamid2)

            await req.user!.notify(`Your ${PROVIDER_NAME} account ${userInfo!.username} has been linked successfully.`)
            await reply.redirect(returnUrl, 302)
        } else {
            // User is logging in to their account via provider
            // We need to find their steam account
            const admin = await fastify.authmngr.getAdminByProvider(PROVIDER_NAME, userInfo!.id)
            if(!admin) throw new RouteError("NO_ACCOUNT_FOUND", `No steam account is linked to this ${PROVIDER_NAME} account. A steam account must be linked to login with ${PROVIDER_NAME}`)

            // We need to refresh steam info as well
            const details = await fastify.steam.getUserDetail(new SteamID(admin.steamid))
            await provider.save(admin.steamid)
            await fastify.authmngr.loginUser(req, reply, admin, details)
            sendMetric(`oauth_${PROVIDER_NAME}_login`, 1)
            await reply.redirect(returnUrl, 302)
        }
    })

    async function getRedirectUri() {
        const domain = fastify.config.Domain
        if(!domain) return null
        return `${domain}/api/auth/${PROVIDER_NAME}/callback`
    }

    async function generateState(user?: User) {
        return await JWT.sign<StateJwtPayoad>({
            seed: STATE_SEED,
            provider: PROVIDER_NAME,
            pub: user?.steamid2,
        }, STATE_JWT_SECRET, {
            expiresIn: '1hr'
        })
    }
}
