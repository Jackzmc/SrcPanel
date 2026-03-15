import type { APICountData, APIUserWithChoice, APIDiscussionOption } from '@common/Discussions'

export interface DiscussOptionEntry {
  option: APIDiscussionOption,
  count?: APICountData,
  users?: APIUserWithChoice[]
}
