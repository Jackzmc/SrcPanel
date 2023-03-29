import { Action, Service, ServicePrivilege, UserPrivileges } from "./Privileges.js"

export enum WebRole {
    None = 0,
    ReadOnly = 1,
    ReadWrite = 2,
    Admin = 3,
}

export enum WebPermission {
    RconAccess = 1 << 1,
    ManageAdmins = 1 << 2,
    CanWrite = 1 << 3,
    FullPermission = 1 << 4,
    ConfigRead = 1 << 5,
    ConfigWrite = 1 << 6,
    ConfigRawView = 1 << 7,
}

  
export const WEB_FLAGS: Record<WebPermission, string> = {
    [WebPermission.RconAccess]: 'RCON Access',
    [WebPermission.ManageAdmins]: 'Manage Admins',
    [WebPermission.CanWrite]: 'Can Add / Modify / Delete',
    [WebPermission.FullPermission]: 'Full Permission / Super-admin',
    [WebPermission.ConfigRead]: 'Read Config Files',
    [WebPermission.ConfigWrite]: 'Edit Config Files',
    [WebPermission.ConfigRawView]: 'Can view unfiltered config files'
}

export interface SessionData extends BaseSession {
    ip: string,
    loginTime: number,
    countryCode: string,
    version?: string
}
interface BaseSession {
    user: SessionUser,
    permissions: AdminPermissions,
}
export interface UserData extends BaseSession {
    isSessionOld: boolean,
    providers: UserOauthProviders
}

export type OauthProvider = "discord"

export interface OauthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

export type UserOauthProviders = Partial<Record<OauthProvider, string>>

export interface SessionUser {
    steamid: string,
    accountid: string,
    name:  string,
    profileurl: string,
    avatarhash: string,
}

export const FLAGS = {
    'a': 'Reserved Slot',
    'b': 'Generic Admin',
    'c': 'Kick',
    'd': 'Ban',
    'e': 'Unban',
    'f': 'Slay/harm others',
    'g': 'Change the map',
    'h': 'Change cvar rules',
    'i': 'Execute custom config files',
    'j': 'Use admin chat',
    'k': 'Start a generic vote',
    // 'l': 'Set a password on the server',
    'm': 'Ingame rcon access',
    'n': 'Enable sv_cheats or use cheat commands',
    'o': 'Custom 1',
    'p': 'Custom 2',
    'q': 'Custom 3',
    'r': 'Custom 4',
    's': 'Custom 5',
    't': 'Custom 6',
}

export interface AdminData {
    id?: number,
    authtype: "steam" | "name" | "ip",
    identity: string,
    password: string | null,
    name: string,
    permissions: AdminPermissions

    groups: AdminGroup[]
}

export interface ReadableAdminData {
    id: number,
    steamid: string,
    name: string,
    permissions: AdminPermissions
    groups: AdminGroup[]
}

export interface AdminGroup {
    id: number,
    flags: string,
    name: string,
    immunity: 0,
    privileges: Partial<Record<Service, ServicePrivilege>>,
}

export interface APIAdminGroup extends AdminGroup {
    canApply: boolean
}

export interface AdminPermissions {
    immunityLevel: number
    flags: string,
    privileges: UserPrivileges,
    web: { // TODO: REMOVE ME LEGACY
        role: number,
        flags: number
    },
    base: {
        immunityLevel: number,
        flags: string,
        privileges: UserPrivileges
    }
}