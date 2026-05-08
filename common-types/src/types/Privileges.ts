export interface SteamInfo {
    steamid: string
    accountid: string
    name: string,
    profileurl?: string,
    avatarhash?: string
}

export const UserPrivilegeCodes = [
    "notes.view", "notes.create", "notes.edit", "notes.edit.others", "notes.delete", "notes.delete.others"
    , "bans.view", "bans.create", "bans.edit", "bans.edit.others", "bans.delete", "bans.delete.others"
    , "bans.appeals.manage", "bans.appeals.delete"
    , "admins.view", "admins.grant", "admins.edit", "admins.edit.others", "admins.revoke"
    , "shares.view", "shares.manage"
    , "shares.addons.view", "shares.addons.edit", "shares.addons.delete"
    , "shares.addons.upload", "shares.addons.upload.direct", "shares.addons.upload.steam_workshop"
    , "panel.view", "panel.manage", "panel.update"
    , "servers.view", "servers.action.builtin.start", "servers.action.builtin.stop", "servers.action.builtin.unreserve", "servers.plugin.builtin", "servers.action.builtin.request_stop"
    , "servers.configs.read", "servers.configs.read_raw", "servers.configs.edit", "servers.generate_jwt", "servers.view_console"
    , "logs.view", "logs.redact", "admins.disable_policy_check"
    , "admins.notify_rcon_use", "admins.impersonate", "panel.restart"
] as const

export type UserPrivilegeCode = typeof UserPrivilegeCodes[number]