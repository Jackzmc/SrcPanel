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