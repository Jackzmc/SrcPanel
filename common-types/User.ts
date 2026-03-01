import type { UserPrivilegeCode } from "./Privileges.js"


export interface SessionData {
  id: string,
  ip: string,
  loginTime: number,
  lastActive: number,
  countryCode?: string,
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
  profile: UserProfileData | null,
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
export interface ProviderConnectionDataEnabled extends RegisteredProvider {
  enabled: true,
  expired: boolean,
  data: OauthProviderData
}
export interface ProviderConnectionDataDisabled extends RegisteredProvider {
  enabled: false,
}
export type ProviderConnectionData = ProviderConnectionDataEnabled | ProviderConnectionDataDisabled

export type UserOauthProviders = Partial<Record<OauthProvider, OauthProviderData>>

export interface SessionUser {
  steamid: string,
  accountid: string,
  name: string,
  profileurl?: string,
  avatarhash?: string,
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

interface BaseAdminData<T, P> {
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
export interface APIListAdmins {
  admins: ReadableAdminData[]
}
export interface ReadableAdminData extends BaseAdminData<ReadableAdminGroup, UserPrivilegeCode[]> {
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
export enum NotificationLevel {
  Default,
  Info,
  Success,
  Warning,
  Error
}
export interface UserNotification extends AddUserNotification {
  timestamp: number,
}
export interface AddUserNotification extends UserNotificationOptions {
  message: string,
}
export interface UserNotificationOptions {
  link?: string,
  level?: NotificationLevel,
  targetSteamid?: string
}
export interface UserProfileData {
  birthDate?: number,
  birthMonth?: number // 0 indexed. 11 is dec
}
/**
 * Represents a real user, one who has a valid SteamID2, and who may have a name
 *
 * @export
 * @interface APIUser
 * @extends {APIPlayer}
 */
export interface APIUser extends APIPlayer {
  id: string,
}
/**
 * Represents a player / user entry. This entry may not be a real human, but a bot.
 * As such the id field can be null, and the name can be unknown.
 * At least ID or Name SHOULD exist
 */
export interface APIPlayer {
  /** The ID, typically SteamID2 of entry */
  id: string | null,
  /** The name, if known of entry */
  name: string | null
  /** @deprecated Avatar URL, use /api/users/:id/avatar. Overwrites automatic avatar urls */
  avatarUrl?: string | null
}
export interface UserNameEntry {
  name: string,
  timestamp: number
}
export interface AnalysisData {
  client: APIUser,
  rating: { key: string, value: number },
  reputation: { thumbsUp: number, thumbsDown: number, sum: number, total: number }
}

/** Represents player for /users/ queries  */
export interface PlayerEntry extends APIPlayer {
  notesCount: number,
  bansCount: number,
  isAdmin: boolean,
  country?: string | null,
  firstJoinDate?: number | null,
  lastJoinDate?: number | null,
}

export interface PlayerRecentEntry extends PlayerEntry {
  server: string,
}

export interface APIListPlayersResponse<T extends PlayerEntry = PlayerEntry> {
  meta: {
    queryTimeSec: number,
    nextOffset?: number
  },
  users: T[]
}

/** GET /api/users/:steamid*/
export interface APIUserDetails {
  meta: {
    includes: {
      profile: boolean,
      admin: boolean,
      names: boolean
    }
    times: {
      user: number
    }
  },
  user: PlayerEntry,
  profile?: UserProfileData | null,
  admin?: ReadableAdminData | null,
  names?: UserNameEntry[]
}
