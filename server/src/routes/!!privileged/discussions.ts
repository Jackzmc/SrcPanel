import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { APIComment, APICountData, APIDiscussion, APIDiscussionCacheableData, APIDiscussionDetails, APIDiscussionFlags, APIDiscussionOption, APIDiscussionType, APIResponsesData, APIUser } from '../../../../common-types/Discussions.js';
import { OkPacket, RowDataPacket } from 'mysql2';
import { NOT_FOUND, NO_PERMISSION } from '../../responses.js';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    const discManager = fastify.managers.discussions
    await discManager.fetchDiscussions()

    fastify.get('/', async (req, reply): Promise<APIDiscussion[]> => {
        const discussions: APIDiscussion[] = []
        for(const discussion of discManager.getAll()) {
            const responses = await discManager.getResponses(discussion.id, req.user, discussion.flags)
            discussions.push({
                ...discussion,
                responses: responses.responses,
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

    // TODO: sanitize .description!
    fastify.put('/:id', async (req: FastifyRequest<{Params: { id: string}}>, reply) => {
        let discuss = discManager.get(Number(req.params.id))
        if(!discuss) return NOT_FOUND(reply, req.params.id)
        else if(discuss.creator.id !== req.user.steamid2) {
            return NO_PERMISSION(reply, "You can only edit your own discussions")
        }
        const newDiscuss = req.body as APIDiscussion
        if(discuss.closedAt && !newDiscuss.closedAt) {
            return reply.status(400).send({
                error: "CANNOT_REOPEN",
                message: "Cannot reopen a closed discussion"
            })
        }
        // Merge new data onto existing
        discuss = {...discuss, ...newDiscuss}
        const conn = await fastify.db.getConnection()
        await conn.beginTransaction()
        await conn.query<OkPacket>(
            "UPDATE `left4dead2-admins`.dash_discussions SET title = ?, description = ?, closed_at = ?, type = ?, flags = ? WHERE id = ?",
            [discuss.title, discuss.description, discuss.closedAt, discuss.type, discuss.flags, req.params.id]
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
        discManager.set(discuss.id, discuss)
        await conn.commit()
        return reply.status(204).send()
    })

    fastify.post('/', async (req: FastifyRequest<{Params: { id: string}}>, reply) => {
        const discuss = req.body as APIDiscussion
        const conn = await fastify.db.getConnection()
        await conn.beginTransaction()
        const [ok] = await conn.query<OkPacket>(
            "INSERT INTO`left4dead2-admins`.dash_discussions (title, description, creator, closed_at, type, flags) VALUES (?, ?, ?, ?, ?, ?)",
            [discuss.title, discuss.description, req.user.steamid2, discuss.closedAt, discuss.type, discuss.flags]
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
        discManager.set(discuss.id, discuss)
        await conn.commit()
        return {
            id: ok.insertId
        }
    })


    fastify.get('/:id', async (req: FastifyRequest<{Params: {id: string}}>, reply): Promise<APIDiscussionDetails> => {
        const domain = await fastify.config.GetKV("domain");
        let discuss = discManager.get(Number(req.params.id))
        if(!discuss) {
            const [rows] = await fastify.db.execute<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.dash_discussions WHERE id = ?", [req.params.id])
            if(rows.length == 0) {
                return NOT_FOUND(reply, req.params.id)
            }
            const [options] = await fastify.db.execute<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.dash_discussion_options WHERE discussion_id = ?", [req.params.id])
            const row = rows[0]
            discuss = {
                id: row.id,
                title: row.title,
                description: row.description,
                timestamp: row.timestamp,
                closedAt: row.closed_at,
                type: row.type,
                options: options.map(o => ({ id: o.id, label: o.label })),
                flags: row.flags,
                commentsCount: 0, // We don't fetch it here as we are fetching the full comment list anyway below.
                creator: {
                    id: row.creator,
                    name: row.creator_name,
                    avatarUrl: `${domain}/api/users/${row.creator}/avatar`
                },
            } 
        }
       
        const [comments] = await fastify.db.execute<RowDataPacket[]>("SELECT com.id, com.creator, com.content, u.last_alias as creator_name FROM `left4dead2-admins`.dash_discussion_comments com LEFT JOIN `left4dead2`.stats_users u ON com.creator = u.steamid WHERE com.discussion_id = ? ", [discuss.id])
        const responses = await discManager.getResponses(Number(req.params.id), req.user, discuss.flags)
        return {
            ...discuss,
            responses: responses.responses,
            commentsCount: comments.length,
            comments: comments.map(c => { 
                return {
                    id: c.id,
                    timestamp: c.timestamp,
                    creator: { id: c.creator, name: c.creator_name, avatarUrl: `${domain}/api/users/${c.creator}/avatar` },
                    content: c.content
                }
            }),
            userSelection: responses.userSelection
        }
    })

    fastify.post('/:id/comments', async (req: FastifyRequest<{Params: {id: string}}>, reply): Promise<APIComment> => {
        const discuss = discManager.get(Number(req.params.id))
        if(!discuss) {
            return NOT_FOUND(reply, req.params.id)
        }
        const comment: Record<string, any> = req.body
        const timestamp = Math.round(Date.now()/1000)
        const [ok] = await fastify.db.query<OkPacket>(
            "INSERT INTO `left4dead2-admins`.dash_discussion_comments (discussion_id, creator, content, timestamp) VALUES (?, ?, ?, UNIX_TIMESTAMP())",
            [discuss.id, req.user.steamid2, comment.content]
        )
        const domain = await fastify.config.GetKV("domain");
        await fastify.authmngr.addNotification(discuss.creator.id, `${await req.user.name()} commented on your discussion \"${discuss.title}\"`, {
            link: `${domain}/discuss/${discuss.id}`,
        })
        return {
            id: ok.insertId,
            creator: {
                id: req.user.steamid2,
                name: await req.user.name(),
                avatarUrl: `${domain}/api/users/${req.user.steamid2}/avatar`
            },
            content: comment.content,
            timestamp
        }
    })
}
