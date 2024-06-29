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
    fastify.route({
        url: '/callback', 
        method: 'GET',
        schema: {
            querystring: {
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
        },
        async handler(req: FastifyRequest<{ Querystring: OpenIDQuery }>, reply: FastifyReply) {
            if(req.query['openid.error']) {
                return {
                    error: 'OPENID_ERROR',
                    message: req.query['openid.error']
                }
            }

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
                    const setupStage = await fastify.config.GetKV<number>("first_time_setup.stage")
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
                        if(req.query.return_uri) {
                            const redirectUri = process.env.STEAM_REDIRECT_URI || "http://localhost:8080"
                            return reply.redirect(`${redirectUri}${req.query.return_uri}`)
                        } else {
                            return {
                                user: req.session.user,
                                permissions: req.session.permissions
                            }
                        }
                    } else {
                        if(req.query.return_uri) {
                            const redirectUri = process.env.STEAM_REDIRECT_URI || "http://localhost:8080"
                            return reply.redirect(`${redirectUri}/login-required?type=1`)
                        } else {
                            return reply.code(401).send({
                                error: 'UNAUTHORIZED',
                                message: 'Account has not been granted admin.'
                            })
                        }
                    }
                } else {
                    return reply.code(401).send({
                        error: 'VALIDATE_ERROR',
                        message: 'Could not validate user due to steam api response error',
                        debug: {
                            query: req.query,
                            params: params.toString(),
                            raw: text
                        }
                    })
                }
            }

            return reply.code(401).send({
                error: 'VALIDATE_ERROR',
                message: 'Could not validate user due to steam api error',
                debug: {
                    query: req.query,
                    error: validateRes.statusText
                }
            })
        }
    })

    async function getUserDetails(steamid: SteamID) {
        try {
            const details = await fastify.steam.getUserDetails([steamid])
            return details[0]
        } catch(err) {
            console.error("auth/steam: getUserDetails error:\n", err) 
            return null
        }
    }
}
