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
    pub?: string,
}

const STATE_SEED_LENGTH = Number(process.env.STATE_SEED_LENGTH) || 20
const STATE_JWT_SECRET = process.env.STATE_SECRET
const STATE_SEED = crypto.randomBytes(STATE_SEED_LENGTH).toString('hex')

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    // Disable discord support if no secret
    if(!STATE_JWT_SECRET) {
        fastify.get("*", (req, reply) => {
            reply.type("text/html")
            reply.send("<h1>Discord login has not be setup</h1>")
        })
    }
    else  fastify.log.info("[Oauth] Discord provider available")

    fastify.get('/login', async (req, reply) => {
        reply.type("text/html")
        const redirectUri = await getRedirectUri()
        const appId = await fastify.config.GetKV("discord.appid")
        // const appSecret = await fastify.config.GetKV("discord.appsecret")
        if(!redirectUri || !appId) return reply.send("<h1>Discord not supported</h1>")
        const params = new URLSearchParams({
            client_id: appId,
            scope: "identify",
            response_type: "code",
            redirect_uri: redirectUri,
            state: await generateState(null)
        })
        return reply.redirect(`https://discordapp.com/oauth2/authorize?${params.toString()}`)
    })

    fastify.get('/link', async (req, reply) => {
        await fastify.authmngr.verify(req, reply)
        reply.type("text/html")
        const redirectUri = await getRedirectUri()
        const appId = await fastify.config.GetKV("discord.appid")
        if(!redirectUri || !appId) return reply.send("<h1>Discord not supported</h1>")
        const params = new URLSearchParams({
            client_id: appId,
            scope: "identify",
            response_type: "code",
            redirect_uri: redirectUri,
            state: await generateState(req.user)
        })
        return reply.redirect(`https://discordapp.com/oauth2/authorize?${params.toString()}`)
    })

    fastify.get('/revoke', async (req, reply) => {
        await fastify.authmngr.verify(req, reply)
        reply.type("text/html")
        await req.user.removeProvider("discord")
        return reply.send("<h1>Discord has been revoked</h1>")
    })

    fastify.get('/callback', async (req: FastifyRequest<{ Querystring: { code: string, state: string, return_uri?: string }}>, reply) => {
        reply.type("text/html")
        if(!req.query.code) return reply.send("<h1>Missing code</h1>")
        if(!req.query.state)  return reply.send("<h1>Missing state</h1>")
        const appId = await fastify.config.GetKV("discord.appid")
        const appSecret = await fastify.config.GetKV("discord.appsecret")
        if(!appId || !appSecret) return reply.send("<h1>Discord not supported</h1>")

        try {
            const jwt = await JWT.verify<StateJwtPayoad>(req.query.state, STATE_JWT_SECRET)
            // The user is linking their discord to their steam login
            const params = new URLSearchParams()
            params.append('client_id', appId)
            params.append('client_secret', appSecret)
            params.append('grant_type', 'authorization_code')
            params.append('code', req.query.code)
            params.append('redirect_uri', await getRedirectUri())
            const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                method: 'POST',
                body: params
            })
            if(!tokenResponse.ok) {
                req.log.error(`discord token error: ${tokenResponse.status} ${tokenResponse.statusText}\n${await tokenResponse.text()}`)
                return reply.status(503).send("<h1>An error occurred with processing your login</h1>")
            }
            const tokenJson: OauthTokenResponse = await tokenResponse.json()

            const userResponse = await fetch("https://discord.com/api/users/@me", {
                headers: {
                    Authorization: `Bearer ${tokenJson.access_token}`
                }
            })
            if(!userResponse.ok) {
                req.log.error(`discord users error: ${userResponse.status} ${userResponse.statusText}\n${await userResponse.text()}`)
                return reply.status(503).send("<h1>An error occurred with processing your login")
            }
            const userJson: DiscordUser = await userResponse.json()

            if(jwt.payload.pub) {
                
                await req.user.addProvider("discord", {
                    id: userJson.id,
                    username: `${userJson.username}#${userJson.discriminator}`,
                    avatarUrl: `https://cdn.discordapp.com/avatars/${userJson.id}/${userJson.avatar}.png`
                }, tokenJson.refresh_token)

                return reply.send("<h1>Discord is now linked, you can close this page</h1>")
            } else {
                // User is logging in to their account via discord
                const admin = await fastify.authmngr.getAdminByProvider("discord", userJson.id)
                if(!admin) return reply.send("<h1>You must link your discord account to your admin panel account first</h1>")
                const details = await fastify.steam.getUserDetails([ new SteamID(admin.steamid) ])
                if(details.length > 0) {
                    await fastify.authmngr.loginUser(req, details[0], admin)
                    const domain = await fastify.config.GetKV("domain");
                    if(req.query.return_uri) {
                        return reply.redirect(302, `${domain}${req.query.return_uri}`)
                    } else {
                        return reply.redirect(302, domain)
                    }
                } else {
                    return reply.send("<h1>No steam account found</h1>")
                }
            }
        } catch(err) {
            req.log.error(err)
            return reply.send("<h1>Login token has expired, please try again</h1>")
        }
    })

    async function getRedirectUri() {
        const domain = await fastify.config.GetKV("domain")
        if(!domain) return null
        return `${domain}/api/auth/discord/callback`
    }

    async function generateState(user?: User) {
        return await JWT.sign<StateJwtPayoad>({
            seed: STATE_SEED,
            pub: user?.steamid2,
        }, STATE_JWT_SECRET, {
            expiresIn: '1hr'
        })
    }
}

