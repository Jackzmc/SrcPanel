import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { createReadStream } from 'fs';
import Sentiment from 'sentiment'
import { PanelMetaInfo } from '@srcpanel/common/Panel';
import { AnalysisData } from '@srcpanel/common/User';
import path from 'path';
import readline from 'readline';
import { MAIN_DB, TABLE_PREFIX } from '../../middlewares/managers.js';

async function loadSentiments(configFolder: string) {
  try {
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
  } catch (err) {
    // Ignore if file doesn't exist
    if (err.code !== "ENOENT") throw err
    return []
  }
}

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  const sentiment = new Sentiment();
  const analyzeOptions = {
    extras: await loadSentiments(fastify.paths.config)
  };

  function computeRating(content: string) {
    content = content.toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
      .replace(/\s{2,}/g, " ");
    const { score } = sentiment.analyze(content, analyzeOptions)
    return { value: score }
  }

  fastify.get('/analyze/:steamid', async (req: FastifyRequest<{ Params: { 'steamid': string } }>, reply): Promise<AnalysisData> => {
    const [notes] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT notes.*, u.last_name as user, e.last_name as executor, !b.expired as banned
            FROM notes
            LEFT JOIN \`${MAIN_DB}\`.view_${TABLE_PREFIX}_user u ON SUBSTRING(notes.steamid, 11) = u.account_id 
            LEFT JOIN \`${MAIN_DB}\`.view_${TABLE_PREFIX}_user e ON SUBSTRING(notes.markedBy, 11) = e.account_id 
            LEFT JOIN bans as b ON notes.steamid = b.steamid
            WHERE notes.steamid = ?
            ORDER BY notes.id DESC`,
      [req.params.steamid]
    )

    let ratings = 0, key: string | null = null
    const reputation = { thumbsUp: 0, thumbsDown: 0, sum: 0, total: 0 }
    if (notes.length > 0 /*  && !fastify.authmngr.isAdmin(req.params.steamid) */) {
      let totalRatings = 0

      for (const note of notes) {
        if (note.content === "+rep") {
          reputation.thumbsUp++
          reputation.sum += 1
          reputation.total++
        } else if (note.content === "-rep") {
          reputation.thumbsDown++
          reputation.sum -= 1
          reputation.total++
        }

        const rating = computeRating(note.content)
        if (rating.value == 0) continue;
        ratings += rating.value
        totalRatings++
      }

      ratings = ratings / totalRatings

      if (ratings >= 2) key = "positive"
      else if (ratings <= -2) key = "negative"
      else if (ratings > 0.1 || ratings < 0.1) key = "neutral"

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

  fastify.get('/meta', { logLevel: "warn" }, (req, reply): PanelMetaInfo => {
    return {
      settings: fastify.config.PublicMeta,
      steamAvailable: fastify.steam.SteamAvailable,
      providers: Object.entries(fastify.config.Providers)
        .map(([id, data]) => ({ id, name: data.name }))
    }
  })

  fastify.get('/health', { logLevel: "warn" }, async (req, reply) => {
    return {
      uptime: process.uptime(),
      pid: process.pid,
      versions: {
        fastify: fastify.version,
        node: process.versions.node,
      },
      memoryPercentage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
    }
  })

}
