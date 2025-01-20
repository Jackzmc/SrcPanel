import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import SteamID from 'steamid'
import FastGeoip from 'fast-geoip'
import User from '../../modules/users/User.js';
import { SteamInfo } from '../../../../common-types/Privileges.js';
import { FirstTimeSetupStage } from '../../../../common-types/Panel.js';

export const SESSION_VERSION = "3.0"


interface OpenIDQuery {
    'openid.ns': string,
    'openid.mode': string,
    'openid.op_endpoint': string,
    'openid.claimed_id': string,
    'openid.identity': string,
    'openid.return_to': string,
    'openid.realm': string,
    'openid.response_nonce': string
    'openid.assoc_handle': string,
    'openid.signed': string,
    'openid.error'?: string
    'openid.sig': string,
    'return_uri': string,
    'F_U_STEAM': string
}


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.setErrorHandler(async (err, req: FastifyRequest<{Querystring: Record<string, any> }>, reply: FastifyReply) => {
        fastify.log.error(`[auth/steam] Route error: ${err.stack}`)
        const returnTo = req.query.return_uri ?? req.query['openid.return_to'] ?? await fastify.config.GetKV("domain", req.headers.host)
        const url = new URL(returnTo)
        const prefix = `${url.protocol}//${url.host}`
        const params = new URLSearchParams()
        params.append("type", "oauth_internal_error")
        params.append("provider", "steam")
        params.append("code", err.code ?? err.message)
        params.append("req_id", req.id)
        return reply.redirect(`${prefix}/error?${params.toString()}`)
    })

    fastify.route({
        url: '/callback', 
        method: 'GET',
        schema: {
            querystring: {
                type: "object",
                properties: {
                    'openid.mode': { type: 'string' },
                    'openid.claimed_id': { type: 'string' },
                    'openid.identity': { type: 'string' },
                    'openid.return_to': { type: 'string' },
                    'openid.response_nonce': { type: 'string' },
                    'openid.assoc_handle': { type: 'string' },
                    'openid.signed': { type: 'string' },
                    'openid.sig': { type: 'string' },
                    'openid.ns': { type: 'string' },
                    'openid.op_endpoint': { type: 'string' },
                    'return_tab': { type: ['string', 'null'] }
                }
            }
        },
        async handler(req: FastifyRequest<{ Querystring: OpenIDQuery }>, reply: FastifyReply) {
            if(req.query['openid.error']) {
                return {
                    error: 'OPENID_ERROR',
                    message: req.query['openid.error']
                }
            } 
            const returnTo = req.query.return_uri ?? req.query['openid.return_to'] ?? await fastify.config.GetKV("domain", req.headers.host)
            const url = new URL(returnTo)
            const prefix = `${url.protocol}//${url.host}`

            if(!req.query['openid.response_nonce']) {
                req.log.error({ query: req.query }, "[auth/steam] Invalid callback, missing query")
                return reply.redirect(`${prefix}/error?type=oauth_error&provider=steam&oauth_error=LOGIN_STALE_TRY_AGAIN&req_id=${req.id}`)
            }
            req.log.debug({ query: req.query}, 'query')
            req.log.debug(`return_uri=${req.query.return_uri} openid.return_to=${req.query['openid.return_to']}`)


            // Send data back to steam for validation
            const params = new URLSearchParams({...req.query})
            params.set('openid.mode', 'check_authentication')
            const validateRes = await fetch(`https://steamcommunity.com/openid/login?${params.toString()}`, {
                headers: {
                    'User-Agent': 'admin.jackz.me'
                }
            })
            if(validateRes.ok) {
                const text = await validateRes.text()
                // Only result we care about, check if steam says request valid
                if(text.includes('is_valid:true')) {
                    // Extract the steamid
                    const pieces = req.query['openid.identity'].split('/')
                    const steamid = new SteamID(pieces[pieces.length - 1])

                    const userDetails = await getUserDetails(steamid)
                    if(!userDetails) {
                         return reply.code(500).send({
                            error: 'STEAM_API_ERROR',
                            message: 'Could not get user details from Steam API',
                            steamid: req.query['openid.identity']
                        })
                    }

                    const steamid2 = steamid.getSteam2RenderedID()

                    // Handle first time setup:
                    const setupStage = await fastify.config.GetKV<number>("first_time_setup.stage", 0)
                    if(setupStage == FirstTimeSetupStage.FirstSetupComplete) {
                        await fastify.authmngr.addAdmin({
                            authtype: 'steam',
                            identity: steamid2,
                            name: userDetails.personaname,
                            immunity: 10,
                            codes: ["*"]
                        })
                    }
                    

                    const admin = fastify.authmngr.getAdminExport(steamid2)
                    if(admin) {
                        await fastify.authmngr.loginUser(req, admin, userDetails)
                        if(setupStage == 1) {
                            await fastify.config.SetKV("first_time_setup.stage", FirstTimeSetupStage.SteamAdminCreated)
                        }
                        return reply.redirect(req.query.return_uri)
                    } else {
                        return reply.redirect(`${prefix}/error?type=oauth_not_authorized&provider=steam&aoauth_error=UNAUTHORIZED&req_id=${req.id}`)
                    }
                } else {
                    req.log.error("[auth/steam] VALIDATE_ERROR: " + JSON.stringify(req.query))
                    req.log.error({ query: req.query, steamResponse: text }, "[auth/steam] VALIDATE_ERROR")
                    return reply.redirect(`${prefix}/error?type=oauth_error&provider=steam&oauth_error=STEAM_VALIDATION_FAILED&req_id=${req.id}`)
                }
            }

            req.log.error("[auth/steam] STEAM_ERROR: " + await validateRes.text())
            return reply.redirect(`${prefix}/error?type=oauth_error&provider=steam&aoauth_error=STEAM_API_ERROR&req_id=${req.id}`)
        }
    })

    async function getUserDetails(steamid: SteamID) {
        try {
            const details = await fastify.steam.getUserDetails([steamid])
            return details ? details[0] : null
        } catch(err) {
            console.error("auth/steam: getUserDetails error:\n", err) 
            return null
        }
    }
}
