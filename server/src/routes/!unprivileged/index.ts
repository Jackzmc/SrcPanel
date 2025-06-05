import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import { ACTIVITY_LOG_TABLE_NAME } from '../!!privileged/logs.js';
import { generateParams } from '../!!privileged/logs.js';
import { ServerStatus } from '../../../../common-types/Server.js';
import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('assets/data.json', 'utf-8'))
import Sentiment from 'sentiment'
import SteamID from 'steamid';
import { PanelMetaInfo } from '../../../../common-types/Panel.js';
import { AnalysisData } from '../../../../common-types/User.js';


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
    fastify.get('/analyze/:steamid', async(req: FastifyRequest<{Params: { 'steamid': string }}>, reply): Promise<AnalysisData> => {
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

        let ratings = 0, key: string|null = null
        let reputation = { thumbsUp: 0, thumbsDown: 0, sum: 0, total: 0 }
        if(notes.length > 0 /*  && !fastify.authmngr.isAdmin(req.params.steamid) */) {
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

    fastify.get('/appids', async(req, reply) => {
        return fastify.steam.AppTitles
    })
    
    fastify.get('/meta', async(req, reply): Promise<PanelMetaInfo> => {
        return {
            settings: await fastify.config.GetPublicKeyvalues(),
            steamAvailable: fastify.steam.SteamAvailable
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