import { UserPrivilegeCode, UserPrivilegeCodes } from "@srcpanel/common/Privileges"
import { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify"
import { RequirePermissionOptions } from "../modules/users/User.js"
import { NO_PERMISSION } from "../responses.js"

export const GUARD_REQUIRE_PERMISSION = {
    register(fastify: FastifyInstance) {
        fastify.decorateRequest("permCode", "")
    },
    /**
     * Check for a user permission, by calling req.user.requirePermission to check if granted
     * @param checkCode code to check
     * @param options fn that returns options such as resourceId for requirePermission
     */
    prehandler: (
        checkCode: UserPrivilegeCode, 
        options?: (req: FastifyRequest) => RequirePermissionOptions
    ): preHandlerAsyncHookHandler => {
        return async (req: FastifyRequest, reply: FastifyReply) => {
            const [code, granted] = req.user!.requirePermission(checkCode, options ? options(req) : {})
            if (!granted) return NO_PERMISSION(reply)
            req.setDecorator("permCode", code)
        }
    },
    get(req: FastifyRequest): UserPrivilegeCode {
        return req.getDecorator("permCode")
    },
}