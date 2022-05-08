export enum WebRole {
    None = 0,
    ReadOnly = 1,
    ReadWrite = 2,
    Admin = 3,
}

export enum WebPermission {
    RconAccess = 1 << 1,
    ManageAdmins = 1 << 2,
}

export interface AdminPermissions {
    immunityLevel: number
    flags?: string,
    web: {
        role: number,
        flags: number
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