import { FastifyReply } from "fastify";

function response(reply: FastifyReply, code: number, error: string, message: string, extra?: Record<string, any>) {
    return reply.status(code).send({
        error, message, ...extra
    })
}

export function NOT_LOGGED_IN(reply: FastifyReply, code = "NOT_LOGGED_IN", message = "You are not logged in") {
    return response(reply, 403, code, message)
}

export function NO_PERMISSION(reply: FastifyReply, altMessage?: string) {
    return response(reply, 401, "NO_PERMISSION", altMessage ?? "You are not authorized to access this resource")
}

export function NOT_FOUND(reply: FastifyReply, resource: string) {
    return response(reply, 404, `${resource.toUpperCase()}_NOT_FOUND`, `${resource} was not found`)
}