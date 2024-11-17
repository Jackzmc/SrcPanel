import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import JWT from '../../jwt-promise.js'
import crypto from 'node:crypto'
import User from '../../modules/users/User.js';
import { SteamInfo } from '../../../../common-types/Privileges';
import SteamID from 'steamid';

interface OauthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    verified: boolean;
    email?: string;
    flags: number;
    banner: string;
    accent_color: number;
    premium_type: number;
    public_flags: number;
}

interface StateJwtPayoad {
    seed: string,
    provider: string,
    pub?: string,
}

const STATE_SEED_LENGTH = Number(process.env.STATE_SEED_LENGTH) || 20
const STATE_JWT_SECRET = process.env.STATE_SECRET as string
const STATE_SEED = crypto.randomBytes(STATE_SEED_LENGTH).toString('hex')

const PROVIDER_NAME = "discord"

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    // Disable discord support if no secret
    if(!process.env.STATE_SECRET) {
        fastify.get("*", async (req, reply) => {
            reply.type("text/html")
            const domain = await fastify.config.GetKV("domain")
            return reply.redirect(`${domain}/error?type=oauth_error&provider=${PROVIDER_NAME}&oauth_error=provider_not_supported`)
        })
    }
    else fastify.log.info(`[Oauth] Provider "${PROVIDER_NAME}" available`)


    const loginLinkHandler = async (req, reply) => {
        const isLink = req.url.endsWith("/link")
        reply.type("text/html")
        const redirectUri = await getRedirectUri()
        const clientId = await fastify.config.GetKVNamespaced("providers", PROVIDER_NAME, "clientId")
        const domain = await fastify.config.GetKV("domain")
        const authorizeUrl = await fastify.config.GetKVNamespaced("providers", PROVIDER_NAME, "authorize_url")
        if(!redirectUri || !clientId || !authorizeUrl) {
            return reply.redirect(`${domain}/error?type=oauth_error&provider=${PROVIDER_NAME}&oauth_error=provider_not_supported`)
        }
        const params = new URLSearchParams({
            client_id: clientId,
            scope: "identify",
            response_type: "code",
            redirect_uri: redirectUri,
            state: await generateState(isLink ? req.user : null)
        })
        return reply.redirect(`${authorizeUrl}?${params.toString()}`)
    }
    ["/login", "/link"].forEach(url => fastify.get.bind(fastify)(url, loginLinkHandler))

    fastify.get('/revoke', async (req, reply) => {
        await fastify.authmngr.verify(req, reply)
        reply.type("text/html")
        // await req.user.notify(`Your ${PROVIDER_NAME} account ${userInfo.username} has been linked successfully.`)
        await req.user!.removeProvider(PROVIDER_NAME)
        // TODO: redirect back send notification
        return reply.send("<h1>Discord has been revoked</h1>")
    })

    fastify.get('/callback', async (req: FastifyRequest<{ Querystring: { code: string, state: string, return_uri?: string }}>, reply) => {
        reply.type("text/html")
        if(!req.query.code) return reply.send("<h1>Missing code</h1>")
        if(!req.query.state) return reply.send("<h1>Missing state</h1>")
        const domain = await fastify.config.GetKV<string>("domain");
        try {
            const jwt = await JWT.verify<StateJwtPayoad>(req.query.state, STATE_JWT_SECRET)
            const provider = await fastify.authmngr.oauth.getProvider(PROVIDER_NAME)
            if(!provider) {
                return reply.redirect(`${domain}/error?type=oauth_error&provider=${PROVIDER_NAME}&oauth_error=provider_not_supported`)
            }
            try {
                // Converts code into access token
                await provider.authorize(req.query.code)
                // We have an access token, so we can fetch details
                const userInfo = await provider.fetchDetails()
                const returnUrl = req.query.return_uri ? `${domain}${req.query.return_uri}` : domain
                if(jwt.payload.pub) {
                    // User is logged in already, is linking provider
                    await provider.save(req.user!.steamid2)

                    await req.user!.notify(`Your ${PROVIDER_NAME} account ${userInfo!.username} has been linked successfully.`)
                    await reply.redirect(returnUrl, 302)
                } else {
                    // User is logging in to their account via provider
                    // We need to find their steam account
                    const admin = await fastify.authmngr.getAdminByProvider(PROVIDER_NAME, userInfo!.id)
                    if(!admin) return reply.redirect(`${domain}/error?type=oauth_no_account&provider=${PROVIDER_NAME}`)
                    // We need to refresh steam info as well
                    const details = await fastify.steam.getUserDetails([ new SteamID(admin.steamid) ])
                    if(details.length > 0) {
                        await provider.save(admin.steamid)
                        await fastify.authmngr.loginUser(req, admin, details[0])
                        await reply.redirect(returnUrl, 302)
                    } else {
                        return reply.send("<h1>Error: Cannot access steam account information, cannot login.</h1>")
                    }
                }
            } catch(err) {
                req.log.error(`Provider (${PROVIDER_NAME}) token error:` + err.stack)
                return reply.redirect(`${domain}/error?type=oauth_error&provider=${PROVIDER_NAME}&oauth_error=token_error`)
            }
        } catch(err) {
            req.log.error(err)
            return reply.redirect(`${domain}/error?type=oauth_error&provider=${PROVIDER_NAME}&oauth_error=login_token_expired`)
        }
    })

    async function getRedirectUri() {
        const domain = await fastify.config.GetKV("domain")
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

