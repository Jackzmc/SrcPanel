
export interface KeyConfig {
    public?: boolean,
    name?: string
    type: KeysType,
    sensitive?: boolean,
}
export type KeysType = "string" | "integer" | "float" | "url" | "path"
export type Keyvalue = keyof typeof Keyvalues
export type KeysRecords = Record<string, KeyConfig>
export const Keyvalues: KeysRecords = {
    "domain": { type: "url", public: true, name: "Domain" },
    "discord.appid": { type: "string", name: "Discord Appid"},
    "discord.appsecret": { type: "string", name: "Discord App Secret", sensitive: true},
    discord_link: { type: "url", name: "Discord Invite Code" },
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

