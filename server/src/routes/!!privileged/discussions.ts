import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { APIComment, APIDiscussion, APIDiscussionCreateResponse, APIDiscussionFlags, APIDiscussionType, type APIDiscussionWithSubmissions, type APISubmitCommentResponse } from '@srcpanel/common/Discussions';
import { NO_PERMISSION } from '../../util/responses.js';
import { NamespacedMetric } from '../../modules/metrics/influx.js';
import { GUARD_REQUIRE_DISCUSSION } from '#/guards/discussions.js'
import { mapDiscussionType } from '../../modules/discussions/index.js';
import { CreateDiscussionSchema, EditDiscussionSchema, SubmitCommentSchema, SubmitVoteSchema, type APICreateDiscussionRequest, type APIEditDiscussionRequest, type APISubmitCommentRequest as APISubmitCommentRequest, type APISubmitVoteRequest } from '@srcpanel/common/discussions/schemas'

const metric = new NamespacedMetric("discuss")

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  GUARD_REQUIRE_DISCUSSION.register(fastify)

  fastify.get('/', async (req, reply): Promise<APIDiscussionWithSubmissions[]> => {
    const discussions: APIDiscussionWithSubmissions[] = []
    for (const discussion of fastify.managers.discussions.getAll()) {
      const submissions = await fastify.managers.discussions.getSubmissions(discussion.id)
      const userSelection = await fastify.managers.discussions.getUserSubmissions(discussion.id, req.user!)
      discussions.push({
        ...discussion.base,
        submissions,
        userSelection
      })
    }
    return discussions
  })

  fastify.post(
    '/:id/choose', 
    { 
      preHandler: [ GUARD_REQUIRE_DISCUSSION.prehandler() ],
      schema: { body: SubmitVoteSchema } 
    },
    async (req: FastifyRequest<{ Body: APISubmitVoteRequest, Params: { id: string } }>, reply) => {
      const discuss = GUARD_REQUIRE_DISCUSSION.get(req)

      if (discuss.closedAt) {
        if (discuss.isClosed) {
          return reply.status(400).send({
            error: "DISCUSSION_CLOSED",
            message: "Voting for this discussion has been closed"
          })
        }
      }

      switch(discuss.type) {
        case APIDiscussionType.Selection:
        case APIDiscussionType.Radio: {
          if (!('option' in req.body) || Array.isArray(req.body.option)) 
            return reply.status(400).send({ error: "INVALID_OPTION", message: "Options must be a string for radio" })
          await fastify.managers.discussions.setAnswerChoice(discuss.id, req.user!, req.body.option)
          break;
        }
        case APIDiscussionType.Checkbox: {
          if(!('option' in req.body) || typeof req.body.option === "number")
            return reply.status(400).send({ error: "INVALID_OPTION", message: "Options must be an array for checkbox or selection" })
          await fastify.managers.discussions.setAnswerChoice(discuss.id, req.user!, req.body.option)
          break;
        }
        case APIDiscussionType.LongText:
        case APIDiscussionType.ShortText: {
          if (!("text" in req.body)) 
            return reply.status(400).send({ error: "INVALID_CHOICE", message: "Must include the text of the choice" })
          await fastify.managers.discussions.setAnswerText(discuss.id, req.user!, req.body.text)
          break;
        }
        default: {
          return reply.status(501).send({ error: "UNSUPPORTED_TYPE", message: "Server does not support this type of discussion" })
        }
      }

      return reply.status(204).send()
    }
  )

  fastify.put('/:id', 
    { 
      preHandler: [ GUARD_REQUIRE_DISCUSSION.prehandler() ],
      schema: { body: EditDiscussionSchema }
    },
    async (req: FastifyRequest<{ Body: APIEditDiscussionRequest, Params: { id: string } }>, reply) => {
      const discuss = GUARD_REQUIRE_DISCUSSION.get(req)
      if (discuss.creatorId !== req.user!.steamid2) {
        return NO_PERMISSION(reply, "You can only edit your own discussions")
      }
      const newDiscuss = {
        ...req.body,
        type: req.body.type ? mapDiscussionType(req.body.type) : undefined
      }
      if (discuss.closedAt && !newDiscuss.closedAt) {
        return reply.status(400).send({
          error: "CANNOT_REOPEN",
          message: "Cannot reopen a closed discussion"
        })
      }

      const discussObj = { ...discuss.base, ...newDiscuss }
      // discussObj.type should never be undefined - discuss.base is not undefined
      await fastify.managers.discussions.updateDiscussion(discuss.id, discussObj.title, discussObj.description ?? null, discussObj.closedAt, discussObj.type!, discussObj.flags, discussObj.options ?? undefined)

      return reply.status(204).send()
    }
  )

  fastify.get(
    '/:id', 
    { preHandler: [ GUARD_REQUIRE_DISCUSSION.prehandler() ]},
    async (req: FastifyRequest<{ Params: { id: string } }>, reply): Promise<APIDiscussionWithSubmissions> => {
      const discuss = GUARD_REQUIRE_DISCUSSION.get(req)

      const submissions = await fastify.managers.discussions.getSubmissions(discuss.id)
      const userSelection = await fastify.managers.discussions.getUserSubmissions(discuss.id, req.user!)

      return {
        ...discuss.base,
        submissions,
        userSelection
      }
    }
  )

  fastify.get(
    '/:id/comments', 
    { preHandler: [ GUARD_REQUIRE_DISCUSSION.prehandler() ] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply): Promise<APIComment[]> => {
      const discuss = GUARD_REQUIRE_DISCUSSION.get(req)
      
      const comments = await fastify.managers.discussions.getComments(discuss.id)
      return comments
    }
  )


  fastify.post(
    '/', 
    { schema: { body: CreateDiscussionSchema } }, 
    async (req: FastifyRequest<{ Body: APICreateDiscussionRequest }>, reply): Promise<APIDiscussionCreateResponse> => {
      const discuss = req.body
      const type = mapDiscussionType(discuss.type)

      const id = await fastify.managers.discussions.createDiscussion(req.user!, discuss.title, discuss.description ?? null, discuss.closedAt ?? null, type, discuss.flags ?? 0)

      metric.send("created", 1)

      return {
        id
      }
    }
  )

  fastify.post(
    '/:id/comments', 
    { 
      preHandler: [ GUARD_REQUIRE_DISCUSSION.prehandler() ], 
      schema: { body: SubmitCommentSchema } 
    },
    async (req: FastifyRequest<{ Body: APISubmitCommentRequest, Params: { id: string } }>, reply): Promise<APISubmitCommentResponse> => {
      const discuss = GUARD_REQUIRE_DISCUSSION.get(req)

      if (discuss.flags & APIDiscussionFlags.Archived) {
        return reply.code(400).send({
          error: "DISCUSSION_ARCHIVED",
          message: "This discussion has been archived, no new comments are accepted"
        })
      }

      const commentId = await fastify.managers.discussions.submitComment(discuss.id, req.user!, req.body.content)

      metric.send("comment_created", 1)

      return {
        id: commentId,
      }
    }
  )
}
