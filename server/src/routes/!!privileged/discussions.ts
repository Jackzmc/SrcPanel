import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifySchema } from 'fastify';
import { APIComment, APIDiscussion, APIDiscussionCreateResponse, APIDiscussionDetails, APIDiscussionFlags, APIDiscussionType, type APISubmitCommentResponse } from '@srcpanel/common/Discussions';
import { NO_PERMISSION } from '../../util/responses.js';
import { Static, Type } from '@sinclair/typebox';
import { NamespacedMetric } from '../../modules/metrics/influx.js';
import { GUARD_REQUIRE_DISCUSSION } from '#/guards/discussions.js'
import { sendInvalidParamError } from '../../guards/index.js';

const metric = new NamespacedMetric("discuss")

const CreateDiscussion = Type.Object({
  title: Type.String(),
  description: Type.Optional(Type.String()),
  closedAt: Type.Optional(Type.Integer()),
  flags: Type.Optional(Type.Integer()),
  type: Type.Union([Type.Integer(), Type.String()]),
  options: Type.Array(Type.Object({
    label: Type.String()
  }))
})

type CreateDiscussionType = Static<typeof CreateDiscussion>

const SubmitComment = Type.Object({
  content: Type.String()
})

type SubmitComentType = Static<typeof SubmitComment>

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  const discManager = fastify.managers.discussions

  GUARD_REQUIRE_DISCUSSION.register(fastify)

  fastify.get('/', async (req, reply): Promise<APIDiscussion[]> => {
    const discussions: APIDiscussion[] = []
    for (const discussion of discManager.getAll()) {
      const responses = await discManager.getResponses(discussion.id, req.user!, discussion.flags)
      discussions.push({
        ...discussion.base,
        responses: responses.responses,
        userSelection: responses.userSelection
      })
    }
    return discussions
  })

  fastify.post(
    '/:id/choose', 
    { preHandler: [ GUARD_REQUIRE_DISCUSSION.prehandler() ] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const discuss = GUARD_REQUIRE_DISCUSSION.get(req)
      const body: { option?: string[] | string, text?: string } = req.body as Record<string, any>
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
          if (!body.option || Array.isArray(body.option)) 
            return reply.status(400).send({ error: "INVALID_OPTION", message: "Options must be a string for radio" })
          await fastify.managers.discussions.setAnswerChoice(discuss.id, req.user!, body.option)
          break;
        }
        case APIDiscussionType.Checkbox: {
          if (!body.option || !Array.isArray(body.option)) 
            return reply.status(400).send({ error: "INVALID_OPTION", message: "Options must be an array for checkbox or selection" })
          await fastify.managers.discussions.setAnswerChoice(discuss.id, req.user!, body.option)
          break;
        }
        case APIDiscussionType.LongText:
        case APIDiscussionType.ShortText: {
          if (!body.text || body.text == "") 
            return reply.status(400).send({ error: "INVALID_CHOICE", message: "Must include the text of the choice" })
          await fastify.managers.discussions.setAnswerText(discuss.id, req.user!, body.text)
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
    { preHandler: [ GUARD_REQUIRE_DISCUSSION.prehandler() ] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const discuss = GUARD_REQUIRE_DISCUSSION.get(req)
      if (discuss.creatorId !== req.user!.steamid2) {
        return NO_PERMISSION(reply, "You can only edit your own discussions")
      }
      const newDiscuss = req.body as APIDiscussion
      if (discuss.closedAt && !newDiscuss.closedAt) {
        return reply.status(400).send({
          error: "CANNOT_REOPEN",
          message: "Cannot reopen a closed discussion"
        })
      }

      const discussObj = { ...discuss.base, ...newDiscuss }
      await fastify.managers.discussions.updateDiscussion(discuss.id, discussObj.title, discussObj.description ?? null, discussObj.closedAt, discussObj.type, discussObj.flags, discussObj.options ?? undefined)

      return reply.status(204).send()
    }
  )

  fastify.get(
    '/:id', 
    { preHandler: [ GUARD_REQUIRE_DISCUSSION.prehandler() ]},
    async (req: FastifyRequest<{ Params: { id: string } }>, reply): Promise<APIDiscussionDetails> => {
      const discuss = GUARD_REQUIRE_DISCUSSION.get(req)

      const responses = await fastify.managers.discussions.getResponses(Number(req.params.id), req.user!, discuss.flags)

      return {
        ...discuss.base,
        responses: responses.responses,
        userSelection: responses.userSelection
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
    { schema: { body: CreateDiscussion } }, 
    async (req: FastifyRequest<{ Body: CreateDiscussionType }>, reply): Promise<APIDiscussionCreateResponse> => {
      const discuss = req.body as CreateDiscussionType
      let type: APIDiscussionType
      if(typeof discuss.type === "number") type = discuss.type as APIDiscussionType
      else {
        switch(discuss.type) {
          case "radio":
          case "single": 
            type = APIDiscussionType.Radio
            break
          case "select":
            type = APIDiscussionType.Selection
            break
          case "checkbox":
          case "multiple":
            type = APIDiscussionType.Checkbox
            break
          case "short":
            type = APIDiscussionType.ShortText
            break
          case "long":
          case "essay":
            type = APIDiscussionType.LongText
          default:
            return sendInvalidParamError(reply, "type", "invalid or unknown discussion type")
        }
      }
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
      schema: { body: SubmitComment } 
    },
    async (req: FastifyRequest<{ Body: SubmitComentType, Params: { id: string } }>, reply): Promise<APISubmitCommentResponse> => {
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
