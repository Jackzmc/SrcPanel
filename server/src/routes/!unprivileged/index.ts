import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { createReadStream } from 'fs';
import Sentiment from 'sentiment'
import { PanelMetaInfo } from '../../../../common-types/Panel.js';
import { AnalysisData } from '../../../../common-types/User.js';
import path from 'path';
import readline from 'readline';




async function loadSentiments(configFolder: string) {
    const filename = path.join(configFolder, "sentiment-words.csv")
    const fileStream = createReadStream(filename);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const words = {}
    for await (const line of rl) {
        const [word, value] = line.split(",")
        words[word] = Number(value)
    }
    return words
}

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    const sentiment = new Sentiment();
    const analyzeOptions = {
        extras: await loadSentiments(fastify.paths.config)
    };
    
    function computeRating(content: string) {
        content = content.toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"")
        .replace(/\s{2,}/g," ");
        const { score } = sentiment.analyze(content, analyzeOptions)
        return { value: score }
    }

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
        const reputation = { thumbsUp: 0, thumbsDown: 0, sum: 0, total: 0 }
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
    
    fastify.get('/meta', (req, reply): PanelMetaInfo => {
        return {
            settings: fastify.config.PublicMeta,
            steamAvailable: fastify.steam.SteamAvailable
        }
    })

}
