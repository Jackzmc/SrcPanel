
export interface KeyConfig {
    public?: boolean,
    name?: string
    type: KeysType,
    sensitive?: boolean,
    description?: string,
    required: boolean
}
export type KeysType = "string" | "integer" | "float" | "url" | "path"
export type Keyvalue = "domain" | "discord.link" | "servers.long_refresh_interval" | "servers.short_refresh_interval"
export type KeysRecords = Record<string, KeyConfig>
export const Keyvalues: KeysRecords = {
    "domain": { required: true, type: "url", public: true, name: "Domain", description: "The domain used for return urls from Oauth2 login (discord)" },
    "discord.link": { required: false, type: "url", public: false, name: "Discord Invite Link", description: "The link to your discord server" },
    "servers.long_refresh_interval": { required: false, type: "float", name: "Long Refresh Interval", description: "How often in seconds to refresh servers in seconds when no clients are detected", public: true },
    "servers.short_refresh_interval": { required: false, type: "float", name: "Short Refresh Interval", description: "How often in seconds to refresh servers in seconds when clients are detected", public: true },
}
export const PublicKeys = Object.entries(Keyvalues).filter(([k,v]) => v.public).map(([k,v]) => k) as Keyvalue[]

export interface ApiPanelConfig extends KeyConfig {
    value: string
}
export type PanelKeysRecord = Record<Keyvalue, ApiPanelConfig>

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