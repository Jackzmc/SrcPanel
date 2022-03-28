import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import SteamID from 'steamid'
import fetch from 'node-fetch'
import FastGeoip from 'fast-geoip'

const STEAM_WEB_APIKEY = process.env.STEAM_WEB_APIKEY

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
    'return_uri': string
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

            const params = new URLSearchParams({...req.query})
            params.set('openid.mode', 'check_authentication')
            
            const validateRes = await fetch(`https://steamcommunity.com/openid/login?${params.toString()}`)
            if(validateRes.ok) {
                const text = await validateRes.text()
                if(text.includes('is_valid:true')) {
                    const pieces = req.query['openid.identity'].split('/')
                    const steamid = new SteamID(pieces[pieces.length - 1])
                    const details = await fastify.steam.getUserDetails([steamid])
                    if(details && details.length > 0) {
                        const admin = fastify.authmngr.getAdmin(steamid)
                        if(admin) {
                            req.session.user = {
                                steamid: steamid.getSteam2RenderedID(true),
                                accountid: steamid.accountid.toString(),
                                name: details[0].personaname,
                                profileurl: details[0].profileurl,
                                avatarhash: details[0].avatarhash
                            }

                            req.session.ip = req.ip
                            req.session.countryCode = (await FastGeoip.lookup(req.ip)).country
                            req.session.loginTime = Date.now()

                            req.session.permissions = admin.permissions

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
                                    message: 'Account is not authorized'
                                })
                            }
                        }
                    } else {
                        return reply.code(500).send({
                            error: 'STEAM_API_ERROR',
                            message: 'Could not get user details from Steam API'
                        })
                    }
                }
            }

            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Could not validate user',
                debug: req.query
            })
        }
    })
}