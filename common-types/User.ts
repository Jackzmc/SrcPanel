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
}

  
export const WEB_FLAGS: Record<WebPermission, string> = {
    [WebPermission.RconAccess]: 'RCON Access',
    [WebPermission.ManageAdmins]: 'Manage Admins',
    [WebPermission.CanWrite]: 'Can Add / Modify / Delete',
    [WebPermission.FullPermission]: 'Full Permission / Super-admin'
}

export interface AdminPermissions {
    immunityLevel: number
    flags?: string,
    web: {
        role: number,
        flags: number
    },
    manual: {
        immunityLevel: number,
        flags: string
    }
}

export interface Session {
    user: {
      steamid: string,
      accountid: string,
      name:  string,
      profileurl: string,
      avatarhash: string,
    },
    permissions: AdminPermissions
    ip: string,
    loginTime: number,
    countryCode: string
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

export interface AdminGroup {
    id: number,
    flags: string,
    name: string,
    immunity: 0
}