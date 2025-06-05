export interface SMPluginMeta {
  version?: string,
  author?: string,
  description?: string,
  name?: string,
  engines: string[],
  includes: string[],
  includesOptional: string[],
  flags?: SMPluginFlag,
  requires?: string
}
export const enum SMPluginFlag {
  None,
  Required = 1,
  Recommended = 2,
  Recommended_ExtraPlayers = 4,
  Library = 8
}
export interface CustomServerForm {
  name: string,
  // appid: number;
  game: number,
  extraPlayers: boolean
  enabledPlugins: string[],
  enabledAddons: string[]
}

export interface CustomServerMetaInfo {
  plugins: Record<string, SMPluginMeta>,
  games: {
    appid: number,
    title: string
  }[]
}

export interface CustomServerInfo {
  id: string,
  name: string,
  serverId: string,
  hostname: string,
  ip: string,
  port: number,
  game: string,
}