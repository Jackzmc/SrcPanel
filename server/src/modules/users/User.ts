import { AdminData } from '../../../../common-types/User';
import { FastifyInstance } from 'fastify'

export const enum ServiceAction {
    View = 0, // Allow a user to view the service
    Edit = 1, // Allows the user to edit their own entries
    Delete = 3, // Allows the user to delete their entries
    Manage = 4, // Allows the user to manage (edit, delete) other entries, not created by them
}
export const ServiceActionKey = {
    [ServiceAction.View]: "view",
    [ServiceAction.Edit]: "edit",
    [ServiceAction.Delete]: "delete",
    [ServiceAction.Manage]: "manage",
}

export enum Service {
    Notes = "notes",
    Bans = "bans",
    Admins = "admin"
}

export const ServiceSupportedActions: Record<Service, ServiceAction[]> = {
    [Service.Notes]: [ ServiceAction.View, ServiceAction.Edit, ServiceAction.Manage ],
    [Service.Bans]: [ ServiceAction.View, ServiceAction.Edit, ServiceAction.Manage, ServiceAction.Delete ],
    [Service.Admins]: [ ServiceAction.View, ServiceAction.Manage ]
} 

export interface SteamInfo {
    steamid: string
    accountid: string
    name: string,
    profileurl: string,
    avatarhash: string
}

export type UserPrivileges = Partial<Record<Service, ServiceAction>>

export default class User {
    private steamInfo: SteamInfo
    private adminData?: AdminData
    private fastify: FastifyInstance

    private privileges: UserPrivileges

    constructor(_fastify: FastifyInstance, _steamInfo, _adminData: AdminData, _privileges: UserPrivileges) {
        this.fastify = _fastify;
        this.steamInfo = _steamInfo;
        this.adminData = _adminData;
        this.privileges = _privileges;
    }

    get isAdmin() {
        return this.adminData != null
    }

    hasPrivilege(service: Service, type: ServiceAction) {
        return this.privileges[service] == type
    }

    getPrivilege(service: Service) {
        return this.privileges[service]
    }

    async logAction(service: Service, type: ServiceAction, message?: string) {
        return await this.fastify.authmngr.log.addWebEntry(this.steamInfo.steamid, `${service}.${ServiceActionKey[type]}`, message)
    }

}