
export interface KeyConfig {
    name?: string
    type: KeysType,
    flags?: KeyFlags
    description?: string,
}

export enum KeyFlags {
    None,
    Public    = 1, /* Is the key public (received by /api/meta) */
    Protected = 2, /* Is the key protected (password, should be hidden in editor) */
    Internal  = 4, /* Should not be user-configable */
    Required  = 8/* Required */
}

export type KeysType = "string" | "integer" | "boolean" | "float" | "url" | "path"
export type KeysRecords = Record<string, KeyConfig>
export const KVConfig: KeysRecords = {
    "domain": { flags: KeyFlags.Public | KeyFlags.Required, type: "url", name: "Domain", description: "The domain used for return urls from Oauth2 login (discord)" },
    "protocol": { flags: KeyFlags.Public | KeyFlags.Required, type: "string", name: "Protocol", description: "HTTP or HTTPs (lowercase)" },
    "discord.link": { type: "url", name: "Discord Invite Link", description: "The link to your discord server" },
    "servers.long_refresh_interval": { flags: KeyFlags.Public, type: "float", name: "Long Refresh Interval", description: "How often in seconds to refresh servers in seconds when no clients are detected", },
    "servers.short_refresh_interval": { flags: KeyFlags.Public, type: "float", name: "Short Refresh Interval", description: "How often in seconds to refresh servers in seconds when clients are detected"},
    "stats_url": { flags: KeyFlags.Public, type: "url", name: "Stats Url", description: "Link to stats server to fetch stat data from"},
    "_version": { flags: KeyFlags.Internal, type: "string" },
    "first_time_setup.stage": { flags: KeyFlags.Internal, type: "integer" },
    "notice": { flags: KeyFlags.Public, type: "string", name: "Notice", description: "A notice to post" },
    "notice.type": { flags: KeyFlags.Public, type: "string", "name": "Notice Type", description: "Class"},
    // TODO: prevent having to hard code providers?
    // /.well-known/openid-configuration
    "providers.discord.clientId": { flags: KeyFlags.Protected, type: "string", name: "Discord - Client Id"},
    "providers.discord.authorize_url": { flags: KeyFlags.Protected, type: "string", name: "Discord - Authorize Url"},
    "providers.discord.clientSecret": { flags: KeyFlags.Protected, type: "string", name: "Discord - Client Secret"},
    "providers.discord.revoke_url": { flags: KeyFlags.Protected, type: "string", name: "Discord - Revoke Url"},
    "providers.discord.token_url": { flags: KeyFlags.Protected, type: "string", name: "Discord - Token Url"},
    "providers.discord.name": { flags: KeyFlags.Protected, type: "string", name: "Discord - Provider Name"},
    "providers.discord.avatar_url_format": { flags: KeyFlags.Protected, type: "string", name: "Discord - URL Format String"},
    "custom_servers.enabled": { flags: KeyFlags.Public, type: "boolean" }
}
export type ConfigKey = keyof typeof KVConfig //"domain" | "discord.link" | "servers.long_refresh_interval" | "servers.short_refresh_interval"
export const PublicKeys = Object.entries(KVConfig)
    .filter(([k,v]) => v.flags && (v.flags & KeyFlags.Public))
    .map(([k,v]) => k) as ConfigKey[]

export interface ApiPanelConfig extends KeyConfig {
    value: string
}
export type PanelKeysRecord = Record<ConfigKey, ApiPanelConfig>

export type UpdateState = "NORMAL" | "GIT_PULL" | "UNLINK_NODE_MODULES" | "PACKAGES_INSTALL" | "TSC" | "RESTARTING" | "CLEANUP_OLD_BUILD"

export interface HealthReport {
    currentState: UpdateState,
    uptime: number
    pid: number,
    versions: {
        fastify: string,
        node: string
    },
    memoryPercentage: number
}

export interface PanelMetaInfo {
    settings: Record<string, any>,
    steamAvailable: boolean,
}

export enum FirstTimeSetupStage {
    Default,
    FirstSetupComplete = 1,
    SteamAdminCreated = 2,

    DONE = 100
}