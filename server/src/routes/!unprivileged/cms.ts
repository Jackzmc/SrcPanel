import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { NOT_FOUND } from '../../responses.js';
import QuickLRU from 'quick-lru';
const CMS_CONFIG = {
    tables: {
        'rules_procedures': {
            title: "Rules & Procedures",
            columns: {
                'slug': { primary: true },
            }
        }
    }
}

export const ADMINS_DB = process.env.MYSQL_ADMINS_DB ? `\`${process.env.MYSQL_ADMINS_DB}\`` : null

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
    const cache = new QuickLRU({
        maxSize: 10,
        maxAge: 1000 * 60 * 2 // 2 min
    })

    fastify.get('/:table', async (req: FastifyRequest<{ Params: { table: string }}>, reply: FastifyReply) => {
        if(!Object.keys(CMS_CONFIG.tables).includes(req.params.table)) {
            return NOT_FOUND(reply, req.params.table, "CMS table not found")
        }
        if(cache.has(req.params.table)) {
            return cache.get(req.params.table)
        }
        const [rows] = await fastify.db.query(`SELECT * FROM ${ADMINS_DB}.${req.params.table}`)
        cache.set(req.params.table, rows)
        return rows
    })
}
