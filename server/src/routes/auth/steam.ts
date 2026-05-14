import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import SteamID from 'steamid'
import { SteamAPIError } from '../../modules/steam.js';
import { ErrorWithCode } from '../../util.js';
import { sendMetric } from '../../modules/metrics/influx.js';

export const SESSION_VERSION = "3.0"
const RouteError = ErrorWithCode

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
        let code: string = "INTERNAL_ERROR", message: string = ""
        if(err instanceof SteamAPIError) {
            if(err.status == 429) {
                code = "STEAM_TEMPORARILY_UNAVAILABLE"
                message = "Steam API is temporarily unavailable (too many requests)"
            } else {
                code = "STEAM_API_ERROR"
                message = `Steam API returned an error (${err.status} ${err.statusText})`
            }
        } else {
            if(err.code) code = err.code
            message = err.message 
        }
        fastify.log.error({
            errName: err.name,
            code,
            message
        }, `[auth/steam] route error`)
        const returnTo = req.query.return_uri ?? req.query['openid.return_to'] ?? fastify.config.Domain
        const url = new URL(returnTo)
        const prefix = `${url.protocol}//${url.host}`
        const params = new URLSearchParams()
        params.append("type", "oauth_error")
        params.append("provider", "steam")
        params.append("code", code)
        params.append("message", message)
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
            const returnTo = req.query.return_uri ?? req.query['openid.return_to'] ?? fastify.config.Domain

            if(req.query['openid.error']) {
                throw new RouteError("OPENID_ERROR", req.query['openid.error'])
            } else if(!req.query['openid.response_nonce']) {
                throw new RouteError("LOGIN_STALE_RETRY_LATER", "Login is stale, wait a few minutes and try again")
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

                    const userDetails = await fastify.steam.getUserDetail(steamid)
                    const steamid2 = steamid.getSteam2RenderedID()

                    // Handle first time setup:
                    // const setupStage = await fastify.config.GetKV<number>("first_time_setup.stage", 0)
                    // if(setupStage == FirstTimeSetupStage.FirstSetupComplete) {
                    //     await fastify.authmngr.addAdmin({
                    //         authtype: 'steam',
                    //         identity: steamid2,
                    //         name: userDetails.personaname,
                    //         immunity: 10,
                    //         codes: ["*"]
                    //     })
                    // }
                    

                    const admin = fastify.authmngr.getAdminExport(steamid2)
                    if(admin) {
                        await fastify.authmngr.loginUser(req, reply, admin, userDetails)
                        sendMetric("oauth_steam_login", 1)
                        // if(setupStage == 1) {
                        //     await fastify.config.SetKV("first_time_setup.stage", FirstTimeSetupStage.SteamAdminCreated)
                        // }
                        return reply.redirect(returnTo)
                    } else {
                        throw new RouteError("UNAUTHORIZED", "Only admins can login to this panel")
                    }
                } else {
                    req.log.error({ query: req.query, steamResponse: text }, "[auth/steam] VALIDATE_ERROR")
                    throw new RouteError("STEAM_VALIDATION_FAILED", "Steam rejected login, retry again later")
                }
            }

            throw new RouteError("STEAM_API_ERROR", "Could not contact Steam API, try again later")
        }
    })
}
