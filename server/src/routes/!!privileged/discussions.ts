import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { APICountData, APIDiscussion, APIDiscussionDetails, APIDiscussionFlags, APIDiscussionOption, APIDiscussionType, APIResponsesData, APIUser } from '../../../../common-types/Discussions.js';
import { OkPacket, RowDataPacket } from 'mysql2';
import { NOT_FOUND, NO_PERMISSION } from '../../responses.js';
import User from '../../modules/users/User.js';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    async function getResponses(id: number, user: User, includeUsers: boolean): Promise<{ responses: APIResponsesData, userSelection: number[] }> {
        const totalUsers = fastify.authmngr.AdminCount
        const domain = await fastify.config.GetKV("domain");
        const [responses] = await fastify.db.execute<RowDataPacket[]>(
            "SELECT res.steamid, res.choice, u.last_alias as name FROM `left4dead2-admins`.dash_discussion_responses res LEFT JOIN `left4dead2`.stats_users u ON res.steamid = u.steamid WHERE res.discussion_id = ?", [id]
        )
        const counts: Record<string, APICountData> = {}
        const userSelection: number[] = []
        for(const response of responses) {
            if(!counts[response.choice])
                counts[response.choice] = { count: 0, percent: 0 }
            counts[response.choice].count++
            counts[response.choice].percent = counts[response.choice].count / responses.length

            if(response.steamid == user.steamid2) {
                userSelection.push(Number(response.choice))
            }
        }
        return {
            responses: {
                totalCount: responses.length,
                percentVoted: responses.length / totalUsers,
                counts,
                users: includeUsers ? responses.map(r => ({ id: r.steamid, name: r.name, avatarUrl: `${domain}/api/users/${r.steamid}/avatar` })) : undefined
            },
            userSelection
        }
    }
    fastify.get('/', async (req, reply): Promise<APIDiscussion[]> => {
        const domain = await fastify.config.GetKV("domain");
        let [rows] = await fastify.db.execute<RowDataPacket[]>("SELECT d.*, u.last_alias as creator_name, (SELECT COUNT(*) FROM `left4dead2-admins`.dash_discussion_comments WHERE discussion_id = d.id) as comments FROM `left4dead2-admins`.dash_discussions d LEFT JOIN `left4dead2`.stats_users u ON u.steamid = d.creator ORDER BY d.timestamp DESC")
        const discussions: APIDiscussion[] = []
        for(const row of rows) {
            const [options] = await fastify.db.execute<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.dash_discussion_options WHERE discussion_id = ?", [row.id])
            const responses = await getResponses(row.id, req.user, (row.flags & APIDiscussionFlags.PublicResponses) != 0)
            discussions.push({
                id: row.id,
                title: row.title,
                description: row.description,
                timestamp: row.timestamp,
                expires: row.expires,
                type: row.type,
                options: options.map(o => ({ id: o.id, label: o.label })),
                responses: responses.responses,
                flags: row.flags,
                commentsCount: row.comments,
                creator: {
                    id: row.creator,
                    name: row.creator_name,
                    avatarUrl: `${domain}/api/user/${row.creator}/avatar`
                },
                userSelection: responses.userSelection
            })
        }
        return discussions
    })

    fastify.post('/:id/choose', async (req: FastifyRequest<{Params: { id: string}, Querystring: { option: string | string[] }}>, reply) => {
        const [discussions] = await fastify.db.execute<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.dash_discussions WHERE id = ?", [req.params.id])
        if(discussions.length == 0) {
            return NOT_FOUND(reply, req.params.id)
        }
        const discuss = discussions[0] as APIDiscussion
        await fastify.db.execute("DELETE FROM `left4dead2-admins`.dash_discussion_responses WHERE discussion_id = ? AND steamid = ?", [discuss.id, req.user.steamid2])
        if(discuss.type == APIDiscussionType.Radio) {
            // Insert new, or update existing
            if(Array.isArray(req.query.option)) return reply.status(400).send({ error: "INVALID_OPTION", message: "Options must be a string for radio"})
            await fastify.db.execute(
                "INSERT INTO `left4dead2-admins`.dash_discussion_responses (discussion_id, steamid, choice) VALUES (?, ?, ?)", 
                [discuss.id, req.user.steamid2, req.query.option]
            )
        } else if(discuss.type == APIDiscussionType.Checkbox || discuss.type == APIDiscussionType.Selection) {
            if(!Array.isArray(req.query.option)) return reply.status(400).send({ error: "INVALID_OPTION", message: "Options must be an array for checkbox or selection"})
            for(const option of req.query.option) {
                await fastify.db.execute(
                    "INSERT INTO `left4dead2-admins`.dash_discussion_responses (discussion_id, steamid, choice) VALUES (?, ?, ?)", 
                    [discuss.id, req.user.steamid2, option]
                )
            }
        } else {
            return reply.status(501).send()
        }
        return reply.status(204).send()
    })

    fastify.put('/:id', async (req: FastifyRequest<{Params: { id: string}}>, reply) => {
        const [rows] = await fastify.db.execute<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.dash_discussions WHERE id = ?", [req.params.id])
        if(rows.length == 0) {
            return NOT_FOUND(reply, req.params.id)
        } else if(rows[0].creator != req.user.steamid2) {
            return NO_PERMISSION(reply, "You can only edit your own discussions")
        }
        const discuss = {...rows[0], ...req.body as APIDiscussion }
        const conn = await fastify.db.getConnection()
        await conn.beginTransaction()
        await conn.query<OkPacket>(
            "UPDATE `left4dead2-admins`.dash_discussions SET title = ?, description = ?, expires = ?, type = ?, flags = ? WHERE id = ?",
            [discuss.title, discuss.description, discuss.expires, discuss.type, discuss.flags, req.params.id]
        )
        const [options] = await conn.query<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.dash_discussion_options WHERE discussion_id = ?", [req.params.id])
        for(const option of discuss.options) {
            const existingOption = options.find(o => o.id === option.id)
            if(existingOption) {
                if(existingOption.label === option.label) continue
                await conn.query(
                    "UPDATE `left4dead2-admins`.dash_discussion_options SET label = ? WHERE id = ?",
                    [option.label, existingOption.id]
                )
            } else {
                await conn.query(
                    "INSERT INTO `left4dead2-admins`.dash_discussion_options (discussion_id, label) VALUES (?, ?)",
                    [req.params.id, option.label]
                )
            }
        }
        await conn.commit()
        return reply.status(204).send()
    })

    fastify.post('/', async (req: FastifyRequest<{Params: { id: string}}>, reply) => {
        const discuss = req.body as APIDiscussion
        const conn = await fastify.db.getConnection()
        await conn.beginTransaction()
        const [ok] = await conn.query<OkPacket>(
            "INSERT INTO`left4dead2-admins`.dash_discussions (title, description, creator, expires, type, flags) VALUES (?, ?, ?, ?, ?, ?)",
            [discuss.title, discuss.description, req.user.steamid2, discuss.expires, discuss.type, discuss.flags]
        )
        discuss.id = ok.insertId
        // TODO: bulk options in one query
        for(const option of discuss.options) {
            //option.id here is a dummy value used by UI.
            await conn.query(
                "INSERT INTO `left4dead2-admins`.dash_discussion_options (discussion_id, label) VALUES (?, ?)",
                [ok.insertId, option.label]
            )
        }
        await conn.commit()
        return reply.status(200).send({
            id: ok.insertId
        })
    })


    fastify.get('/:id', async (req: FastifyRequest<{Params: {id: string}}>, reply): Promise<APIDiscussionDetails> => {
        const domain = await fastify.config.GetKV("domain");
        const [rows] = await fastify.db.execute<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.dash_discussions WHERE id = ?", [req.params.id])
        if(rows.length == 0) {
            return NOT_FOUND(reply, req.params.id)
        }
        const row = rows[0]
        const [options] = await fastify.db.execute<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.dash_discussion_options WHERE discussion_id = ?", [req.params.id])
        const [comments] = await fastify.db.execute<RowDataPacket[]>("SELECT com.id, com.creator, com.content, u.last_alias as creator_name FROM `left4dead2-admins`.dash_discussion_comments com LEFT JOIN `left4dead2`.stats_users u ON com.creator = u.steamid WHERE com.discussion_id = ? ", [req.params.id])
        const responses = await getResponses(Number(req.params.id), req.user, (row.flags & APIDiscussionFlags.PublicResponses) != 0)
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            timestamp: row.timestamp,
            expires: row.expires,
            type: row.type,
            options: options.map(o => ({ id: o.id, label: o.label })),
            responses: responses.responses,
            flags: row.flags,
            commentsCount: comments.length,
            comments: comments.map(c => { 
                return {
                    id: c.id,
                    timestamp: c.timestamp,
                    creator: { id: c.creator, name: c.creator_name, avatarUrl: `${domain}/api/users/${c.creator}/avatar` },
                    content: c.content
                }
            }),
            creator: {
                id: row.creator,
                name: row.creator_name,
                avatarUrl: `${domain}/api/users/${row.creator}/avatar`
            },
            userSelection: responses.userSelection
        }
    })
}
