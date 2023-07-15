import { AdminData, OauthProvider, OauthProviderData, SessionData, SessionUser, UserOauthProviders } from '../../../../common-types/User';
import { SteamInfo, UserPrivileges, Service, ServicePrivilege, ActionRequiredPrivilege, Action, UserPrivilegeCode } from '../../../../common-types/Privileges.js';
import AuthManager from '../AuthManager.js';
import { Session } from 'fastify';

export interface LogProperties {
    targetUser?: string,
    metadata?: Record<string, any>
}

export interface LogPropertiesType extends LogProperties {
    type: string
}
export interface LogPropertiesServiceAction extends LogProperties {
    service: Service,
    action: Action
}
export interface LogPropertiesPermCode extends LogProperties {
    code: UserPrivilegeCode,
}

export type LogData = LogPropertiesType | LogPropertiesServiceAction | LogPropertiesPermCode
export type PermissionResult = [UserPrivilegeCode, boolean]
export interface RequirePermissionOptions {
    isCreator?: boolean,
    resourceId?: string | number
}

export default class User {
    private adminData?: AdminData
    private authmngr: AuthManager
    private _providers: UserOauthProviders

    public steamid2: string

    constructor(_authmngr: AuthManager, steamid2: string) {
        this.authmngr = _authmngr;
        this.steamid2 = steamid2
        this.adminData = _authmngr.getAdmin(steamid2)
    }

    get isAdmin() {
        return this.adminData != null
    }

    // Make a copy
    get privileges() {
        if(!this.isAdmin) return null
        return { ...this.adminData.permissions.privileges }
    }

    get immunity() {
        if(!this.isAdmin) return null
        return this.adminData.permissions.immunityLevel
    }

    get baseImmunity() {
        if(!this.isAdmin) return null
        return this.adminData.permissions.base.immunityLevel
    }

    get hasRoot() {
        if(!this.isAdmin) return null
        return this.adminData.permissions.flags.includes('z')
    }

    get baseFlags() {
        if(!this.isAdmin) return null
        return this.adminData.permissions.base.flags
    }

    get flags() {
        if(!this.isAdmin) return null
        return this.adminData.permissions.flags
    }

    get providers() {
        return this._providers
    }

    // get ip() {
    //     return this.
    // }

    /**
     * @deprecated
     */
    async grantPrivilege(service: Service, privilege: ServicePrivilege) {
        await this.authmngr.setPrivileges(this.steamid2, { [service]: privilege })
    }

    
    /**
     * @deprecated
     */
    hasPrivilege(service: Service, type: ServicePrivilege) : boolean {
        if(!this.isAdmin) return false
        return this.adminData.permissions.privileges[service] === type
    }

    hasPermission(code: UserPrivilegeCode, ...resourceIds: (string | number | undefined)[]) {
        // TODO: Make sure user for 'servers.configs.read' has access to 'servers.configs'? idk verify
        let permCode: string = code
        for(const resource of resourceIds) {
            permCode += `.${resource}`
        }
        for(const perm of this.adminData.permissions.codes) {
            if(AuthManager.isPermissionGranted(permCode as UserPrivilegeCode, perm)) return true
        }
        return false
    }


    requirePermission(code: UserPrivilegeCode, options: RequirePermissionOptions = {}): PermissionResult {
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
        }
        // TODO: Hoist up to not waste time computing lower?
        return [code, this.hasPermission(code)]
    }

    /**
     * @deprecated
     */
    canPerformAction(service: Service, action: Action) : boolean {
        if(!this.isAdmin) return false
        return this.hasPrivilege(service, ActionRequiredPrivilege[action])
    }

    /**
     * @deprecated
     */
    getPrivilege(service: Service) {
        if(!this.isAdmin) return null
        return this.adminData.permissions.privileges[service]
    }

    async log(targetUser: User | string | null, message: string, payload?: LogData) {
        let user: User = null
        if(targetUser != null) {
            if(targetUser instanceof User) user = targetUser
            else user = new User(this.authmngr, targetUser) 
        }
        await this.authmngr.log.logWeb(this, user, message, payload)
    }

    async addProvider(provider: OauthProvider, providerData: OauthProviderData, refreshToken?: string) {
        return await this.authmngr.setProvider(this.steamid2, provider, providerData, refreshToken)
    }

    async removeProvider(provider: OauthProvider) {
        return await this.authmngr.setProvider(this.steamid2, provider, null)
    }

    async getProvider(provider: OauthProvider) {
        if(!this._providers) await this.updateProviders()
        return this._providers[provider]
    }

    async updateProviders() {
        this._providers = await this.authmngr.getProviders(this.steamid2)
    }

    async getSessions() {
        return await this.authmngr.getSessions(this.steamid2)
    }

    async getApiKey() {
        return this.authmngr.getAPIKeyForUser(this.steamid2)
    }

    async regenerateApiKey() {
        return this.authmngr.createApiKey(this.steamid2)
    }

    equals(id: string) {
        if(!id) throw new Error("<User>.equals: id is null or undefined")
        if(id === this.steamid2) return true
        else if(id.substring(10) == id.substring(10)) return true

        // Check if id is part of providers (ie, discord)
        const [provider, identifier] = id.split(":")
        if(provider && identifier  && this._providers) {
            const data = this._providers[provider] as OauthProviderData | undefined
            if(data?.id === id) return true
        }

        return false
    }
}