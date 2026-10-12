import { FastifyReply } from "fastify";

export function sendMissingParamError(reply: FastifyReply, param: string, message?: string) {
    return reply.status(400).send({
        error: "MISSING_PARAM",
        param,
        message: message ?? `Missing required parameter "${param}"`
    })
}