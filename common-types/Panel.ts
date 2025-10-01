export interface PanelConfig {
    general: PanelConfigGeneral,

    discord?: {
        link: string
    },


    stats_url: string,

    notice?: PanelConfigNotice
    providers: Record<string, PanelConfigProvider>
}
export interface PanelConfigGeneral {
    listen?: {
        host?: string,
        port?: number
    },
    public_url: string
}
export interface PanelConfigNotice {
    enabled: boolean
    text: string
    class?: string
}
export interface PanelConfigProvider {
    name: string,
    client_id: string,
    client_secret: string,
    token_url: string,
    revoke_url: string,
    user_url: string,
    authorize_url: string,
    avatar_url_format: string
}

export interface PublicConfigMeta {
    notice?: PanelConfigNotice,
    domain: string,
    stats_url: string
}

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
    settings: PublicConfigMeta,
    steamAvailable: boolean,
}

export enum FirstTimeSetupStage {
    Default,
    FirstSetupComplete = 1,
    SteamAdminCreated = 2,

    DONE = 100
}