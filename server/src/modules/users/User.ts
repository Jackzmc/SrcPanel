import { AdminData } from '../../../../common-types/User';
import { SteamInfo, UserPrivileges, Service, ServicePrivilege, ActionRequiredPrivilege, Action } from '../../../../common-types/Privileges.js';
import AuthManager from '../AuthManager.js';

export default class User {
    private steamInfo: SteamInfo
    private adminData?: AdminData
    private authmngr: AuthManager

    private _privileges: UserPrivileges

    constructor(_authmngr: AuthManager, _steamInfo: SteamInfo, _privileges: UserPrivileges) {
        this.authmngr = _authmngr;
        this.steamInfo = _steamInfo;
        this.adminData = _authmngr.getAdmin(this.steamInfo.steamid)
        this._privileges = _privileges;
    }

    get steamid64() {
        return this.steamInfo.steamid
    }

    get isAdmin() {
        return this.adminData != null
    }

    get privileges() {
        return { ... this._privileges }
    }

    async grantPrivilege(service: Service, privilege: ServicePrivilege) {
        await this.authmngr.setPrivileges(this.steamInfo.steamid, { [service]: privilege })
        this._privileges[service] = privilege
    }

    hasPrivilege(service: Service, type: ServicePrivilege) : boolean {
        return this._privileges[service] === type
    }

    canPerformAction(service: Service, action: Action) : boolean {
        return this.hasPrivilege(service, ActionRequiredPrivilege[action])
    }

    getPrivilege(service: Service) {
        return this._privileges[service]
    }

    async logAction(service: Service, action: Action, message?: string) {
        return await this.authmngr.log.addWebEntry(this.steamInfo.steamid, `${service}.${action}`, message)
    }

}