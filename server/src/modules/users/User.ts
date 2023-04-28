import { AdminData, OauthProvider, OauthProviderData, SessionData, SessionUser } from '../../../../common-types/User';
import { SteamInfo, UserPrivileges, Service, ServicePrivilege, ActionRequiredPrivilege, Action } from '../../../../common-types/Privileges.js';
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

export type LogData = LogPropertiesType | LogPropertiesServiceAction

export default class User {
    private adminData?: AdminData
    private authmngr: AuthManager

    public steamid64: string

    constructor(_authmngr: AuthManager, steamid64: string) {
        this.authmngr = _authmngr;
        this.steamid64 = steamid64
        this.adminData = _authmngr.getAdmin(steamid64)
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

    // get ip() {
    //     return this.
    // }

    async grantPrivilege(service: Service, privilege: ServicePrivilege) {
        await this.authmngr.setPrivileges(this.steamid64, { [service]: privilege })
    }

    hasPrivilege(service: Service, type: ServicePrivilege) : boolean {
        if(!this.isAdmin) return false
        return this.adminData.permissions.privileges[service] === type
    }

    canPerformAction(service: Service, action: Action) : boolean {
        if(!this.isAdmin) return false
        return this.hasPrivilege(service, ActionRequiredPrivilege[action])
    }

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
        return await this.authmngr.setProvider(this.steamid64, provider, providerData, refreshToken)
    }

    async removeProvider(provider: OauthProvider) {
        return await this.authmngr.setProvider(this.steamid64, provider, null)
    }

    getProviders() {
        return this.authmngr.getProviders(this.steamid64)
    }

    async getSessions() {
        return await this.authmngr.getSessions(this.steamid64)
    }

    async getApiKey() {
        return this.authmngr.getAPIKeyForUser(this.steamid64)
    }
}