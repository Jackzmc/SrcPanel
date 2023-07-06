// The privilege the user has access to for a given service
export enum ServicePrivilege {
    View = 0, // Allow a user to view the service
    Edit = 1, // Allows the user to edit their own entries, or add their own entry
    Delete = 2, // Allows the user to delete their entries
    Manage = 3, // Allows the user to manage (edit, delete) other entries, not created by them
}
// The string id of the privilege
export const ServicePrivilegeKeys: Record<ServicePrivilege, string> = {
    [ServicePrivilege.View]: "View",
    [ServicePrivilege.Edit]: "Edit",
    [ServicePrivilege.Delete]: "Delete",
    [ServicePrivilege.Manage]: "Manage",
}

// The list of services
export enum Service {
    Notes = "notes",
    Bans = "bans",
    Admins = "admins",
    Addons = "addons",
    AddonsUpload = "addons.upload",
    PanelAdmin = "panel",
    Rcon = "rcon"
}


export const ServiceDescriptions: Record<Service, string> = {
    [Service.Notes]: "Player notes",
    [Service.Bans]: "Player bans",
    [Service.Admins]: "Controls editing admins",
    [Service.Addons]: "Controls viewing and changing addons",
    [Service.AddonsUpload]: "Controls uploading new addons",
    [Service.PanelAdmin]: "Controls managing the admin panel",
    [Service.Rcon]: "Controls rcon access, viewing logs and sending commands"
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
    [Service.AddonsUpload]: [ ServicePrivilege.Edit ],
    [Service.PanelAdmin]: [ ServicePrivilege.View, ServicePrivilege.Edit ],
    [Service.Rcon]: [ ServicePrivilege.View, ServicePrivilege.Manage ]
} 

export interface SteamInfo {
    steamid: string
    accountid: string
    name: string,
    profileurl: string,
    avatarhash: string
}

export type UserPrivileges = Partial<Record<Service, ServicePrivilege | null>>

export type UserPrivilegeCode = "notes.view" | "notes.create" | "notes.edit" | "notes.edit.others" | "notes.delete" | "notes.delete.others"
    | "bans.view" | "bans.create" | "bans.edit" | "bans.edit.others" | "bans.delete" | "bans.delete.others"
    | "admins.view" | "admins.grant" | "admins.edit" | "admins.edit.others" | "admins.revoke"
    | "addons.view" | "addons.edit" | "addons.delete" | "addons.upload"
    | "panel.view" | "panel.manage" | "panel.update"
    | "rcon.view" | "rcon.manage"
    | "configs.read" | "configs.read.raw" | "configs.edit" 
