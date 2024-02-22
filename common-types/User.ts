import { UserPrivilegeCode } from "./Privileges.js"


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
export interface CustomFastifySession extends BaseSession<UserPrivilegeCode[]>, SessionData {
    impersonate?: ImpersationData
}
export interface ImpersationData {
    original: {
        permissions: AdminPermissions<UserPrivilegeCode[]>,
        user: SessionUser
    }
}
export interface UserData<T> extends BaseSession<T> {
    profile: UserProfileData,
    isSessionOld: boolean,
    providers: UserOauthProviders,
    notifications: UserNotification[],
    openDiscussions: number,
    impersonatingId?: string
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

export interface RegisteredProvider {
    id: string
    name: string,
}
export interface ProviderConnectionData extends RegisteredProvider {
    enabled: boolean,
    expired: boolean,
    data?: OauthProviderData
}

export type UserOauthProviders = Partial<Record<OauthProvider, OauthProviderData>>

export interface SessionUser {
    steamid: string,
    accountid: string,
    name:  string,
    profileurl: string,
    avatarhash: string,
}

export const FLAGS: Record<string, string> = {
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
    'n': 'Cheat commands',
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
    codes: T
}

export interface APIAdminGroup extends AdminGroup {
    canApply: boolean
}

export interface AdminPermissions<C> {
    immunityLevel: number
    flags: string,
    codes: C,
    base: {
        immunityLevel: number,
        flags: string,
        codes: C
    },
}

export interface UserNotification extends AddUserNotification {
    timestamp: number,
}
export interface AddUserNotification extends UserNotificationOptions {
    message: number,
}
export interface UserNotificationOptions {
    link?: string
}
export interface UserProfileData {
    birthDate?: number,
    birthMonth?: number // 0 indexed. 11 is dec
}