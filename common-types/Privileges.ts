// The privilege the user has access to for a given service
export enum ServicePrivilege {
    View = 0, // Allow a user to view the service
    Edit = 1, // Allows the user to edit their own entries, or add their own entry
    Delete = 2, // Allows the user to delete their entries
    Manage = 3, // Allows the user to manage (edit, delete) other entries, not created by them
}
// The string id of the privilege
export const ServicePrivilegeKeys = {
    [ServicePrivilege.View]: "view",
    [ServicePrivilege.Edit]: "edit",
    [ServicePrivilege.Delete]: "delete",
    [ServicePrivilege.Manage]: "manage",
}

// The list of services
export enum Service {
    Notes = "notes",
    Bans = "bans",
    Admins = "admins",
    Addons = "addons",
    AddonsUpload = "addons.upload"
}

// The action that is being done, for logging, and what privilege it requires
export enum Action {
    View = "view",
    Create = "create",
    Edit = "edit",
    Delete = "delete",
}
export const ActionRequiredPrivilege: Record<Action, ServicePrivilege> = {
    [Action.View]: ServicePrivilege.View,
    [Action.Create]: ServicePrivilege.Edit,
    [Action.Edit]: ServicePrivilege.Edit,
    [Action.Delete]: ServicePrivilege.Delete,
}

// Controls what actions the service supports
export const ServiceSupportedActions: Record<Service, ServicePrivilege[]> = {
    [Service.Notes]: [ ServicePrivilege.View, ServicePrivilege.Edit, ServicePrivilege.Manage ],
    [Service.Bans]: [ ServicePrivilege.View, ServicePrivilege.Edit, ServicePrivilege.Delete, ServicePrivilege.Manage],
    [Service.Admins]: [ ServicePrivilege.View, ServicePrivilege.Manage ],
    [Service.Addons]: [ ServicePrivilege.View, ServicePrivilege.Edit, ServicePrivilege.Delete ],
    [Service.AddonsUpload]: [ ServicePrivilege.Edit ]
} 

export interface SteamInfo {
    steamid: string
    accountid: string
    name: string,
    profileurl: string,
    avatarhash: string
}

export type UserPrivileges = Partial<Record<Service, ServicePrivilege | null>>