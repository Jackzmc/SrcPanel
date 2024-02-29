import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { ACTIVITY_LOG_TABLE_NAME } from '../!!privileged/logs.js';
import { generateParams } from '../!!privileged/logs.js';
import { ServerStatus } from '../../modules/servers/Server.js';
import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('assets/data.json', 'utf-8'))
import Sentiment from 'sentiment'
import SteamID from 'steamid';


const sentiment = new Sentiment();
const analyzeOptions = {
  extras: data.sentimentWords
};

const LimitedLogQuery = Type.Object({
    servers: Type.Optional(Type.String()),
    types: Type.Optional(Type.String()),
    client: Type.Optional(Type.String()),
    target: Type.Optional(Type.String()),
    timestamp: Type.Optional(Type.Integer()),
    timestampBefore: Type.Optional(Type.Boolean()),
    orderByColumn: Type.Optional(Type.String()),
    orderByAscending: Type.Optional(Type.Boolean()),
    searchMessage: Type.Optional(Type.String()),
    search_message: Type.Optional(Type.String()),
    fetchAll: Type.Optional(Type.Boolean()),
    timestampOnly: Type.Optional(Type.Boolean({ default: false }))
})
type LimitedLogQueryType = Static<typeof LimitedLogQuery>

const GRAPH_WHITELIST = {
    "types": ["ACTION", "STATE", "QUIT", "JOIN"]
};


interface DisplayedServer extends CompactDisplayedServer {
    domain ? : string;
    ip: string,
    port: number,
    type: string,
    tags: Readonly<string[]>,
    status: ServerStatus
}
interface CompactDisplayedServer {
    id: string,
    name: string
}
export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    fastify.get('/analyze/:steamid', async(req: FastifyRequest<{Params: { 'steamid': string }}>, reply) => {
        const [notes] = await fastify.db.execute<RowDataPacket[]>(
            `SELECT notes.*, u.last_alias as user, e.last_alias as executor, !b.expired as banned
            FROM notes 
            LEFT JOIN stats_users as u ON notes.steamid = u.steamid 
            LEFT JOIN stats_users as e ON notes.markedBy = e.steamid 
            LEFT JOIN bans as b ON notes.steamid = b.steamid 
            WHERE notes.steamid = ?
            ORDER BY notes.id DESC`,
            [req.params.steamid]
        )

        let ratings = 0, key: string = null
        let reputation = { thumbsUp: 0, thumbsDown: 0, sum: 0, total: 0 }
        if(notes.length > 0 && !fastify.authmngr.isAdmin(req.params.steamid)) {
            let totalRatings = 0

            for(const note of notes) {
                if(note.content === "+rep") {
                    reputation.thumbsUp++
                    reputation.sum += 1
                    reputation.total++
                } else if(note.content === "-rep") {
                    reputation.thumbsDown++
                    reputation.sum -= 1
                    reputation.total++
                }

                const rating = computeRating(note.content)
                if(rating.value == 0) continue;
                ratings += rating.value
                totalRatings++
            }

            ratings = ratings / totalRatings

            if(ratings >= 2) key = "positive" 
            else if(ratings <= -2) key = "negative"
            else if(ratings > 0.1 || ratings < 0.1) key = "neutral"

        }

        return reply.send({
            client: {
                id: req.params.steamid,
                name: notes.length > 0 ? notes[0].user : null,
            },
            rating: {
                key,
                value: Number(ratings.toFixed(2))
            },
            reputation
        })
    })

    fastify.get('/graph', async(req: FastifyRequest<{Querystring: LimitedLogQueryType}>, reply) => {
        const searchMessage = req.query.searchMessage ? `%${req.query.searchMessage}%` : (req.query.search_message ? `%${req.query.search_message}%` : null)

        let query: string;

        if(req.query.timestampOnly) {
            query = `SELECT timestamp, message FROM ${ACTIVITY_LOG_TABLE_NAME} `
        } else {
            query = `SELECT id, timestamp, server, type, client, target, message, s1.last_alias as clientName, s2.last_alias as targetName FROM activity_log LEFT JOIN stats_users as s1 ON s1.steamid = client LEFT JOIN stats_users as s2 ON s2.steamid = target `
        }


        const conditions = []
        let data = []

        if(req.query.servers) {
            const servers = req.query.servers.split(",")
            console.log('servers', servers.length, servers)
            conditions.push(`server IN (${generateParams(servers.length)})`)
            data = [ ...data, ...servers ]
        }
        if(req.query.types) {
            const types = req.query.types.split(",")
            for(const type of types) {
                if(!GRAPH_WHITELIST.types.includes(type)) {
                    return reply.code(403).send({
                        error: 'QUERY_NOT_ALLOWED',
                        message: `Type ${type} is not in the query whitelist`,
                        whitelist: GRAPH_WHITELIST
                    })
                }
            }
            conditions.push(`type IN (${generateParams(types.length)})`)
            data = [ ...data, ...types ]
        }
        if(req.query.client && req.query.target) {
            conditions.push('(client = ? OR target = ?)')
            data = [ ...data, req.query.client, req.query.target ]
        } else if(req.query.client && !req.query.target) {
            conditions.push('client = ?')
            data.push(req.query.client)
        } else if(!req.query.client && req.query.target) {
            conditions.push('target = ?')
            data.push(req.query.target)
        }

        if(req.query.timestamp) {
            conditions.push(req.query.timestampBefore ? 'timestamp <= ?' : 'timestamp >= ?')
            data.push(req.query.timestamp)
        }

        if(searchMessage) {
            conditions.push(`message LIKE ?`)
            data.push(searchMessage)
        }

        if(conditions.length > 0) {
            query += `WHERE ${conditions.join(' AND ')} `
        }

        query += `ORDER BY id ${req.query.orderByAscending ? 'ASC' : 'DESC'} `

        const [logs] = await fastify.db.query(query, data)
        

        return {
            logs,
        }
    })

    fastify.get('/appids', async(req, reply) => {
        return fastify.steam.AppTitles
    })
    
    fastify.get('/meta', async(req, reply) => {
        return {
            servers: await fastify.config.GetServers(),
            settings: await fastify.config.GetPublicKeyvalues()
        }
    })

}

function computeRating(content: string) {
    content = content.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
      .replace(/\s{2,}/g," ");
    const { score } = sentiment.analyze(content, analyzeOptions)
    return { value: score }
}