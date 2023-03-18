import { AdminData, SessionData, SessionUser } from '../../../../common-types/User';
import { SteamInfo, UserPrivileges, Service, ServicePrivilege, ActionRequiredPrivilege, Action } from '../../../../common-types/Privileges.js';
import AuthManager from '../AuthManager.js';
import { Session } from 'fastify';

export default class User {
    private adminData?: AdminData
    private authmngr: AuthManager
    private userdata: Session

    constructor(_authmngr: AuthManager, userdata: Session) {
        this.authmngr = _authmngr;
        this.userdata = userdata
        this.adminData = _authmngr.getAdmin(userdata.user.steamid)
    }

    get steamid64() {
        return this.userdata.user.steamid
    }

    get isAdmin() {
        return this.adminData != null
    }

    get privileges() {
        return { ... this.userdata.privileges }
    }

    private get privs() {
        return this.userdata.privileges
    }

    get immunity() {
        return this.userdata.permissions.immunityLevel
    }

    get baseImmunity() {
        return this.userdata.permissions.base.immunityLevel
    }

    get hasRoot() {
        return this.userdata.permissions.flags.includes('z')
    }

    get baseFlags() {
        return this.userdata.permissions.base.flags
    }

    get flags() {
        return this.userdata.permissions.flags
    }

    get ip() {
        return this.userdata.ip
    }

    async grantPrivilege(service: Service, privilege: ServicePrivilege) {
        await this.authmngr.setPrivileges(this.steamid64, { [service]: privilege })
        this.privs[service] = privilege
    }

    hasPrivilege(service: Service, type: ServicePrivilege) : boolean {
        return this.privs[service] === type
    }

    canPerformAction(service: Service, action: Action) : boolean {
        return this.hasPrivilege(service, ActionRequiredPrivilege[action])
    }

    getPrivilege(service: Service) {
        return this.privs[service]
    }

    async logAction(service: Service, action: Action, message?: string) {
        return await this.authmngr.log.addWebEntry(this.steamid64, `${service}.${action}`, message)
    }

}