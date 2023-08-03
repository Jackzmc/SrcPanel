
export interface KeyConfig {
    public?: boolean,
    name?: string
    type: KeysType,
    sensitive?: boolean,
    description?: string,
    required: boolean
}
export type KeysType = "string" | "integer" | "float" | "url" | "path"
export type Keyvalue = "domain" | "discord.appid" | "discord.appsecret" | "discord.link"
export type KeysRecords = Record<string, KeyConfig>
export const Keyvalues: KeysRecords = {
    "domain": { required: true, type: "url", public: true, name: "Domain", description: "The domain used for return urls from Oauth2 login (discord)" },
    "discord.appid": { required: false, type: "string", name: "Discord Appid"},
    "discord.appsecret": { required: false, type: "string", name: "Discord App Secret", sensitive: true},
    "discord.link": { required: false, type: "url", name: "Discord Invite Code", description: "A link to a discord server, joinable from the 'Administration' dropdown" },
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