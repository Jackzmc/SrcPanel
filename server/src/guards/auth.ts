import { UserPrivilegeCode, UserPrivilegeCodes } from "@srcpanel/common/Privileges"
import { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify"
import { RequirePermissionOptions } from "../modules/users/User.js"
import { NO_PERMISSION } from "../responses.js"
import AuthManager from "../modules/auth/AuthManager.js"
import { PanelConfigProvider } from "@srcpanel/common/Panel"
import { sendMissingParamError } from "./index.js"
import { OauthProviderUser } from "../modules/auth/OauthProvider.js"

export const GUARD_REQUIRE_LOGGED_IN = {
    register(fastify: FastifyInstance) {

    },
    prehandler: (): preHandlerAsyncHookHandler => {
        return async (req: FastifyRequest, reply: FastifyReply) => {
            if(!await req.server.authmngr.verify(req, reply)) return
        }
    }
}

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

export interface OauthProviderGuard {
    config: PanelConfigProvider,
    user: OauthProviderUser
}
export const GUARD_REQUIRE_OAUTH_PROVIDER = {
    register(fastify: FastifyInstance) {
        fastify.decorateRequest("provider", null)
    },
    prehandler: (
    ): preHandlerAsyncHookHandler => {
        return async (req: FastifyRequest, reply: FastifyReply) => {
            const { provider } = req.params as { provider: string }
            if(!provider) return sendMissingParamError(reply, "provider")
        
            const cfg = req.server.config.GetProvider(provider)
            const prov = req.server.authmngr.oauth.getProvider(provider)

            if(!!cfg || !prov) return reply.send(401).send({
                error: "UNKNOWN_PROVIDER",
                message: "No provider exists with that id"
            })
            req.setDecorator("provider", {
                config: cfg,
                user: prov
            })
        }
    },
    get(req: FastifyRequest): OauthProviderGuard {
        return req.getDecorator("provider")
    },
}