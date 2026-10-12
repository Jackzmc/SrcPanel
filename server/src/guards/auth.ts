import { UserPrivilegeCode } from "@srcpanel/common/Privileges"
import { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify"
import { RequirePermissionOptions } from "../modules/users/User.js"
import { NO_PERMISSION } from "../responses.js"

/**
 * Check for a user permission, by calling req.user.requirePermission to check if granted
 * @param checkCode code to check
 * @param options fn that returns options such as resourceId for requirePermission
 * @returns decorator 'permCode' with code from requirePermission
 */
export function requirePermission(
  checkCode: UserPrivilegeCode, 
  options?: (req: FastifyRequest) => RequirePermissionOptions
): preHandlerAsyncHookHandler {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const [code, granted] = req.user!.requirePermission(checkCode, options ? options(req) : {})
    if (!granted) return NO_PERMISSION(reply)
    req.setDecorator('permCode', code)
  }
}