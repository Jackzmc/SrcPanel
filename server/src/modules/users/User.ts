import { AdminData, OauthProvider, OauthProviderData, SessionData, SessionUser, UserNotification, UserNotificationOptions, UserOauthProviders } from '../../../../common-types/User';
import { UserPrivilegeCode } from '../../../../common-types/Privileges.js';
import AuthManager from '../auth/AuthManager.js';
import { FastifyInstance, Session } from 'fastify';
import UserManager from './UserManager.js';
import SteamID from 'steamid';

export interface LogProperties {
    targetUser?: string,
    metadata?: Record<string, any>
}

export interface LogPropertiesType extends LogProperties {
    type: string
}
export interface LogPropertiesPermCode extends LogProperties {
    code: UserPrivilegeCode,
}

export type LogData = LogPropertiesType | LogPropertiesPermCode
export type PermissionResult = [UserPrivilegeCode, boolean]
export interface RequirePermissionOptions {
    isCreator?: boolean,
    resourceId?: string | number
    resourceIds?: (string | number | undefined)[]
}

export default class User {
    #adminData?: AdminData
    #providers: UserOauthProviders
    #name: string
    #fastify: FastifyInstance

    public steamid2: string

    constructor(fastify: FastifyInstance, steamid2: string) {
        this.#fastify = fastify
        this.steamid2 = steamid2
        this.#adminData = fastify.authmngr.getAdmin(steamid2)
    }
    
    /**
     * Return user's name, fetching it if not cached
     * @returns string 
     */
    public async name() {
        if(this.#name) return this.#name
        const user = await UserManager.instance.fetchUser(new SteamID(this.steamid2))
        if(!user) return null
        this.#name = user.name
        return this.#name
    }

    /**
     * Is user an admin
     */
    get isAdmin() {
        return this.#adminData != null
    }

    /**
     * Returns the user's computed highest immunity level
     */
    get immunity() {
        if(!this.isAdmin) return null
        return this.#adminData!.permissions.immunityLevel
    }

    /**
     * The base immunity level the user has
     */
    get baseImmunity() {
        if(!this.isAdmin) return null
        return this.#adminData!.permissions.base.immunityLevel
    }

    /**
     * Does the user have root game permissions ("z" flag)
     */
    get hasRoot() {
        if(!this.isAdmin) return null
        return this.#adminData!.permissions.flags.includes('z')
    }

    /**
     * List of base game flags
     */
    get baseFlags() {
        if(!this.isAdmin) return null
        return this.#adminData!.permissions.base.flags
    }

    /**
     * List of game flags (base flags + computed from group(s))
     */
    get flags() {
        if(!this.isAdmin) return null
        return this.#adminData!.permissions.flags
    }

    /**
     * Record of login providers user has
     */
    get providers() {
        return this.#providers
    }

    get permCodes() {
        return new Set([...this.#adminData!.permissions.codes])
    }

    /**
     * Sends a notification for the user on the admin panel
     * @param message The message to send
     * @param options
     */
    async notify(message: string, options: UserNotificationOptions = {}) {
        await this.#fastify.authmngr.addNotification(this.steamid2, message, options)
    }

    /**
     * Returns all notifications for user
     * @returns 
     */
    async getNotifications(): Promise<UserNotification[]> {
        return await this.#fastify.authmngr.getNotifications(this.steamid2)
    }

    async clearNotifications(): Promise<void> {
        await this.#fastify.authmngr.clearNotifications(this.steamid2)
    }

    async getOpenDiscussionsCount(): Promise<number> {
        const count = await this.#fastify.managers.discussions.getUnrespondedCount(this.steamid2)
        return count
    }

    /**
     * Does user have permission for this code, and optionally a sub resource 
     * @param code 
     * @param resourceIds 
     * @returns 
     */
    hasPermission(code: UserPrivilegeCode, ...resourceIds: (string | number | undefined)[]) {
        if(process.env.DEBUG_DISABLE_PERMISSION_SYSTEM) return true
        if(!this.isAdmin) return false
        // TODO: Make sure user for 'servers.configs.read' has access to 'servers.configs'? idk verify
        let permCode: string = code
        for(const resource of resourceIds) {
            permCode += `.${resource}`
        }
        console.debug(this.#adminData!.permissions.codes, typeof this.#adminData!.permissions.codes)
        if(!this.#adminData!.permissions.codes) return false
        for(const perm of this.#adminData!.permissions.codes) {
            if(AuthManager.isPermissionGranted(permCode as UserPrivilegeCode, perm)) return true
        }
        return false
    }

    /**
     * Automatically appends permission strings for resources, returning the code used for permission checks 
     * @param code the permission code that passed
     * @param options 
     * @returns 
     */
    requirePermission(code: UserPrivilegeCode, options: RequirePermissionOptions = {}): PermissionResult {
        if(process.env.DEBUG_DISABLE_PERMISSION_SYSTEM) return ["*" as UserPrivilegeCode, true]
        let permCode: string = code
        if(options.isCreator != undefined) {
            permCode = `${code}.others`
            if(this.hasPermission(permCode as UserPrivilegeCode)) {
                return [permCode as UserPrivilegeCode, true]
            }
        } else if(options.resourceId != undefined) {
            permCode = `${code}.${options.resourceId}`
            if(this.hasPermission(permCode as UserPrivilegeCode)) {
                return [permCode as UserPrivilegeCode, true]
            }
        } else if(options.resourceIds != undefined) {
            // Filter out undefined:
            const ids = options.resourceIds.filter(r => r).join(".")
            permCode = `${code}.${ids}`
            if(this.hasPermission(permCode as UserPrivilegeCode)) {
                return [permCode as UserPrivilegeCode, true]
            }
        }
        // TODO: Hoist up to not waste time computing lower?
        return [code, this.hasPermission(code)]
    }

    /**
     * Adds a web entry to the audit logs
     * @param targetUser Optional, another user this user is targetting 
     * @param message 
     * @param payload 
     * @returns ID number of log entry
     */
    async log(targetUser: User | string | null, message: string, payload?: LogData): Promise<number> {
        let user: User|null = null
        if(targetUser != null) {
            if(targetUser instanceof User) user = targetUser
            else user = new User(this.#fastify, targetUser) 
        }
        return await this.#fastify.authmngr.log.logWeb(this, user, message, payload)
    }

    async removeProvider(provider: OauthProvider) {
        return await this.#fastify.authmngr.setProvider(this.steamid2, provider, null)
    }

    async getProvider(provider: OauthProvider) {
        if(!this.#providers) await this.getProviders()
        return this.#providers[provider]
    }

    /**
     * Updates cached list of providers
     */
    async updateProviders() {
        this.#providers = await this.#fastify.authmngr.updateProviders(this.steamid2)
        return this.#providers
    }

    /**
     * Fetches cached list of providers
     */
    async getProviders() {
        this.#providers = await this.#fastify.authmngr.getProviders(this.steamid2)
    }
    

    /**
     * Returns a list of active web sessions for user
     * @returns 
     */
    async getSessions() {
        return await this.#fastify.authmngr.getSessions(this.steamid2)
    }

    /**
     * Returns the api key for user, if any was generated
     * @returns 
     */
    async getApiKey() {
        return this.#fastify.authmngr.getAPIKeyForUser(this.steamid2)
    }

    async regenerateApiKey() {
        return this.#fastify.authmngr.createApiKey(this.steamid2)
    }

    equals(id: string) {
        if(!id) throw new Error("<User>.equals: id is null or undefined")
        if(id === this.steamid2) return true
        else if(id.substring(10) == id.substring(10)) return true

        // Check if id is part of providers (ie, discord)
        const [provider, identifier] = id.split(":")
        if(provider && identifier  && this.#providers) {
            const data = this.#providers[provider] as OauthProviderData | undefined
            if(data?.id === id) return true
        }

        return false
    }
}