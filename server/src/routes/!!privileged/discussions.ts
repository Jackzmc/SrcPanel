import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifySchema } from 'fastify';
import { APIComment, APIDiscussion, APIDiscussionCreateResponse, APIDiscussionDetails, APIDiscussionFlags, APIDiscussionOption, APIDiscussionType, BaseDiscussion } from '@srcpanel/common/Discussions';
import { OkPacket, RowDataPacket } from 'mysql2';
import { NOT_FOUND, NO_PERMISSION } from '../../responses.js';
import { APIPlayer, APIUser } from '@srcpanel/common/User';
import { Static, Type } from '@sinclair/typebox';
import { NamespacedMetric, sendMetric } from '../../modules/metrics/influx.js';
import { ADMINS_DB, TABLE_PREFIX } from '../../middlewares/managers.js';

const metric = new NamespacedMetric("discuss")

const CreateDiscussion = Type.Object({
  title: Type.String(),
  description: Type.Optional(Type.String()),
  closedAt: Type.Optional(Type.Integer()),
  flags: Type.Optional(Type.Integer()),
  type: Type.Integer(),
  options: Type.Array(Type.Object({
    label: Type.String()
  }))
})
type CreateDiscussionType = Static<typeof CreateDiscussion>

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  const discManager = fastify.managers.discussions

  fastify.get('/', async (req, reply): Promise<APIDiscussion[]> => {
    const discussions: APIDiscussion[] = []
    for (const discussion of discManager.getAll()) {
      const responses = await discManager.getResponses(discussion.id, req.user!, discussion.flags)
      discussions.push({
        ...discussion,
        responses: responses.responses,
        userSelection: responses.userSelection
      })
    }
    return discussions
  })

  fastify.post('/:id/choose', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const discuss = discManager.get(Number(req.params.id))
    if (!discuss) return NOT_FOUND(reply, req.params.id)
    const body: { option?: string[] | string, text?: string } = req.body as Record<string, any>
    if (discuss.closedAt) {
      if (Date.now() > discuss.closedAt * 1000) {
        return reply.status(400).send({
          error: "DISCUSSION_CLOSED",
          message: "Voting for this discussion has been closed"
        })
      }
    }
    await fastify.db.execute("DELETE FROM `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_responses WHERE discussion_id = ? AND steamid = ?", [discuss.id, req.user!.steamid2])
    if (discuss.type == APIDiscussionType.Radio) {
      // Insert new, or update existing
      if (!body.option || Array.isArray(body.option)) return reply.status(400).send({ error: "INVALID_OPTION", message: "Options must be a string for radio" })
      await fastify.db.execute(
        "INSERT INTO `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_responses (discussion_id, steamid, choice) VALUES (?, ?, ?)",
        [discuss.id, req.user!.steamid2, body.option]
      )
    } else if (discuss.type == APIDiscussionType.Checkbox || discuss.type == APIDiscussionType.Selection) {
      if (!body.option || !Array.isArray(body.option)) return reply.status(400).send({ error: "INVALID_OPTION", message: "Options must be an array for checkbox or selection" })
      for (const option of body.option) {
        await fastify.db.execute(
          "INSERT INTO `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_responses (discussion_id, steamid, choice) VALUES (?, ?, ?)",
          [discuss.id, req.user!.steamid2, option]
        )
      }
    } else if (discuss.type == APIDiscussionType.ShortText || discuss.type == APIDiscussionType.LongText) {
      if (!body.text || body.text == "") return reply.status(400).send({ error: "INVALID_CHOICE", message: "Must include the text of the choice" })
      await fastify.db.execute(
        "INSERT INTO `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_responses (discussion_id, steamid, text) VALUES (?, ?, ?)",
        [discuss.id, req.user!.steamid2, body.text]
      )
    } else {
      return reply.status(501).send()
    }
    return reply.status(204).send()
  })

  // TODO: sanitize .description!
  fastify.put('/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    let discuss = discManager.get(Number(req.params.id))
    if (!discuss) return NOT_FOUND(reply, req.params.id)
    else if (discuss.creator.id !== req.user!.steamid2) {
      return NO_PERMISSION(reply, "You can only edit your own discussions")
    }
    const newDiscuss = req.body as APIDiscussion
    if (discuss.closedAt && !newDiscuss.closedAt) {
      return reply.status(400).send({
        error: "CANNOT_REOPEN",
        message: "Cannot reopen a closed discussion"
      })
    }
    // Merge new data onto existing
    discuss = { ...discuss, ...newDiscuss }
    const conn = await fastify.db.getConnection()
    await conn.beginTransaction()
    await conn.query<OkPacket>(
      "UPDATE `${ADMINS_DB}`.${TABLE_PREFIX}_discussions SET title = ?, description = ?, closed_at = ?, type = ?, flags = ? WHERE id = ?",
      [discuss.title, discuss.description, discuss.closedAt, discuss.type, discuss.flags, req.params.id]
    )

    const [options] = await conn.query<RowDataPacket[]>("SELECT * FROM `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_options WHERE discussion_id = ?", [req.params.id])
    if (discuss.options) {
      for (const option of discuss.options) {
        const existingOption = options.find(o => o.id === option.id)
        if (existingOption) {
          if (existingOption.label === option.label) continue
          await conn.query(
            "UPDATE `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_options SET label = ? WHERE id = ?",
            [option.label, existingOption.id]
          )
        } else {
          await conn.query(
            "INSERT INTO `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_options (discussion_id, label) VALUES (?, ?)",
            [req.params.id, option.label]
          )
        }
      }
    }
    await conn.commit()
    conn.release()
    // Update cache, deleting if archived
    if (discuss.flags & APIDiscussionFlags.Archived) {
      discManager.delete(discuss.id)
    } else {
      discManager.set(discuss.id, discuss)
    }
    return reply.status(204).send()
  })

  const postSchema: FastifySchema = {
    body: CreateDiscussion
  }

  fastify.post('/', { schema: postSchema }, async (req: FastifyRequest<{ Body: CreateDiscussionType }>, reply): Promise<APIDiscussionCreateResponse> => {
    // TODO: check fields exist
    const discuss = req.body as CreateDiscussionType
    const conn = await fastify.db.getConnection()
    await conn.beginTransaction()
    const [ok] = await conn.query<OkPacket>(
      "INSERT INTO`${ADMINS_DB}`.${TABLE_PREFIX}_discussions (title, description, creator, closed_at, type, flags) VALUES (?, ?, ?, ?, ?, ?)",
      [discuss.title, discuss.description, req.user!.steamid2, discuss.closedAt, discuss.type, discuss.flags]
    )
    const id = ok.insertId
    // TODO: bulk options in one query
    if (discuss.options) {
      for (const option of discuss.options) {
        //option.id here is a dummy value used by UI.
        const [row] = await conn.query<OkPacket>(
          "INSERT INTO `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_options (discussion_id, label) VALUES (?, ?)",
          [id, option.label]
        );
        (option as APIDiscussionOption).id = row.insertId;
      }
    }
    await conn.commit()
    conn.release()
    metric.send("created", 1)
    discManager.set(id, {
      id: id,
      title: discuss.title,
      description: discuss.description,
      timestamp: Math.round(Date.now() / 1000),
      creator: {
        id: req.user!.steamid2,
        name: await req.user!.name(),
      },
      closedAt: discuss.closedAt ?? 0,
      type: discuss.type,
      flags: discuss.flags as APIDiscussionFlags,
      options: discuss.options as APIDiscussionOption[],
      commentsCount: 0
    })
    // TODO: REMOVE ME, TEMP FIX
    await discManager.fetchDiscussions()
    return {
      id: ok.insertId
    }
  })


  fastify.get('/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply): Promise<APIDiscussionDetails> => {
    let discuss = discManager.get(Number(req.params.id))
    if (!discuss) {
      const [rows] = await fastify.db.execute<RowDataPacket[]>("SELECT d.*, COUNT(c.id) as comment_count FROM `${ADMINS_DB}`.${TABLE_PREFIX}_discussions d right join `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_comments c on c.discussion_id = d.id WHERE d.id = ?", [req.params.id])
      if (rows.length == 0) {
        return NOT_FOUND(reply, req.params.id)
      }
      const [options] = await fastify.db.execute<RowDataPacket[]>("SELECT * FROM `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_options WHERE discussion_id = ?", [req.params.id])
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
        commentsCount: row.comment_count,
        creator: {
          id: row.creator,
          name: row.creator_name,
        },
      }
    }

    const responses = await discManager.getResponses(Number(req.params.id), req.user!, discuss.flags)
    return {
      ...discuss,
      responses: responses.responses,
      userSelection: responses.userSelection
    }
  })

  fastify.get('/:id/comments', async (req: FastifyRequest<{ Params: { id: string } }>, reply): Promise<APIComment[]> => {
    const discuss = discManager.get(Number(req.params.id))
    if (!discuss) {
      return NOT_FOUND(reply, req.params.id)
    }

    const [comments] = await fastify.db.execute<RowDataPacket[]>("SELECT com.id, com.timestamp, com.creator, com.content, u.last_name as creator_name FROM `${ADMINS_DB}`.${TABLE_PREFIX}_discussion_comments com LEFT JOIN `left4dead2`.view_${TABLE_PREFIX}_user u ON SUBSTRING(com.creator, 11) = u.account_id WHERE com.discussion_id = ? ", [discuss.id])

    return comments.map(c => {
      let creator: APIPlayer
      if (discuss.flags & APIDiscussionFlags.CommentsPublic) {
        creator = { id: c.creator, name: c.creator_name }
      } else {
        creator = { id: null, name: "Anonymous" }
      }

      return {
        id: c.id,
        timestamp: c.timestamp,
        creator,
        content: c.content
      }
    })
  })

  fastify.post('/:id/comments', async (req: FastifyRequest<{ Params: { id: string } }>, reply): Promise<APIComment> => {
    const discuss = discManager.get(Number(req.params.id))
    if (!discuss) {
      return NOT_FOUND(reply, req.params.id)
    }
    if (discuss.flags & APIDiscussionFlags.Archived) {
      return reply.code(400).send({
        error: "DISCUSSION_ARCHIVED",
        message: "This discussion has been archived, no new comments are accepted"
      })
    }

    const hasCommentsPublic = (discuss.flags & APIDiscussionFlags.CommentsPublic)

    const creator: APIPlayer = {
      id: hasCommentsPublic ? req.user!.steamid2 : null,
      name: hasCommentsPublic ? (await req.user!.name() ?? req.user!.steamid2) : "Anonymous"
    }
    const comment: Record<string, any> = req.body as Record<string, any>
    const timestamp = Math.round(Date.now() / 1000)
    const [ok] = await fastify.db.query<OkPacket>(
      `INSERT INTO \`${ADMINS_DB}\`.${TABLE_PREFIX}_discussion_comments 
        (discussion_id, creator, content, timestamp) 
      VALUES 
        (?, ?, ?, UNIX_TIMESTAMP())`,
      [discuss.id, creator.id, comment.content]
    )

    metric.send("comment_created", 1)
    // Update cache
    discuss.commentsCount++
    discManager.set(discuss.id, discuss)

    const domain = fastify.config.Domain

    if (discuss.creator.id !== req.user!.steamid2) {
      await fastify.authmngr.addNotification(discuss.creator.id, `${creator.name} commented on your discussion "${discuss.title}"`, {
        link: `${domain}/discuss/${discuss.id}`,
      })
    }

    return {
      id: ok.insertId,
      creator,
      content: comment.content,
      timestamp
    }
  })
}
