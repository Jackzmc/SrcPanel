import type { APICountData, APIUserWithChoice, APIDiscussionOption, APIDiscussionFlags } from '@common/Discussions'

export interface DiscussOptionEntry {
  option: APIDiscussionOption,
  count?: APICountData,
  users?: APIUserWithChoice[]
}

interface SettingEntry_Base {
  icon?: string,
  label?: string,
}
export interface SettingEntry_Set extends SettingEntry_Base {
  set: APIDiscussionFlags,
}
export interface SettingEntry_Unset extends SettingEntry_Base {
  unset: APIDiscussionFlags | APIDiscussionFlags[]
}
export type SettingEntry = SettingEntry_Set | SettingEntry_Unset
