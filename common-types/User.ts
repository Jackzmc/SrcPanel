import { Action, Service, ServicePrivilege, UserPrivilegeCode, UserPrivileges } from "./Privileges.js"

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

export interface SessionData {
    id: string,
    ip: string,
    loginTime: number,
    lastActive: number,
    countryCode: string,
    version?: string
}
interface BaseSession<T> {
    user: SessionUser,
    permissions: AdminPermissions<T>,
}
export interface CustomFastifySession<T> extends BaseSession<T>, SessionData {

}
export interface UserData<T> extends BaseSession<T> {
    isSessionOld: boolean,
    providers: UserOauthProviders
}
export type ClientUserData = UserData<UserPrivilegeCode[]>

export type OauthProvider = "discord"

export interface OauthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

export interface OauthProviderData {
    id: string,
    username?: string,
    avatarUrl?: string
}
export type UserOauthProviders = Partial<Record<OauthProvider, OauthProviderData>>

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

interface BaseAdminData<T,P> { 
    id: number,
    name: string,
    permissions: AdminPermissions<P>
    groups: T[],
}
export interface AdminData extends BaseAdminData<AdminGroup, Set<UserPrivilegeCode>> {
    authtype: "steam" | "name" | "ip",
    identity: string,
    password: string | null,
}
export interface ReadableAdminData extends BaseAdminData<ReadableAdminGroup, UserPrivilegeCode[]>{
    steamid: string,
}
export type AdminGroup = BaseAdminGroup<Set<UserPrivilegeCode>>
export type ReadableAdminGroup = BaseAdminGroup<UserPrivilegeCode[]>
interface BaseAdminGroup<T> {
    parentId?: number,
    id: number,
    flags: string,
    name: string,
    immunity: number,
    privileges: Partial<Record<Service, ServicePrivilege>>,
    codes: T
}

export interface APIAdminGroup extends AdminGroup {
    canApply: boolean
}

export interface AdminPermissions<C> {
    immunityLevel: number
    flags: string,
    privileges: UserPrivileges,
    codes: C,
    base: {
        immunityLevel: number,
        flags: string,
        privileges: UserPrivileges,
        codes: C
    }
}