import { APIPlayer, APIUser } from "./User.js"

export enum APIDiscussionFlags {
  None = 0,
  /** Should the avatars/names of those that responded be vsible **/
  RespondersPublic = 1,
  /** Is not listed in main list, no more comments or responses can be made */
  Archived = 2,
  /** Should the actual choices / response be visible? (Requires RespondersPublic) */
  ResponsesPublic = 4,
  CommentsPublic = 8,
  PercentsPublic = 16
}

export enum APIDiscussionType {
  Radio,
  Checkbox,
  Selection,
  ShortText,
  LongText
}

/// MAIN 

export interface APIDiscussionBase {
  title: string,
  timestamp: number,
  closedAt: number | null
  type: APIDiscussionType,
  description?: string,
  options?: APIDiscussionOption[],
  flags: APIDiscussionFlags,
}

export interface APIDiscussionCacheableData extends APIDiscussionBase {
  id: number,
  commentsCount: number
  creator: APIUser,
}

export type APIDiscussion = APIDiscussionCacheableData
export interface APIDiscussionWithSubmissions extends APIDiscussion {
  submissions: APISubmissions
  /** The list of all options the user has selected */
  userSelection: UserSubmission[]
}

/** A discussion option (radio, checkbox, select) */
export interface APIDiscussionOption {
  id: number,
  label: string
}


/// SUBMISSIONS

/** A submission entry, including the user */
export type SubmissionEntry = UserSubmission & { user: APIUser }
/** The submission of a user, either text input or a specific option */
export type UserSubmission = { text: string} | { choice: APIDiscussionOption }

export interface APISubmissions {
  /** Total number of users who have voted */
  totalVoted: number,
  /** The percentage of all available admins that have voted */
  percentVoted: number,
  /** the options and their counts */
  options: (APIDiscussionOption & APICountData)[]
  /** If public, the list of submission entries, including the user and their input */
  users?: SubmissionEntry[]
}

/** @deprecated use APISubmissions */
export interface APIResponsesData {
  /** Total number of users who have voted */
  totalCount: number,
  /** The percentage of all available admins that have voted */
  percentVoted: number,
  /** The counts and percents for each option. Key is the stringified id of option */
  counts: Record<string, APICountData>
  /** If public, the list of submission entries, including the user and their input */
  users?: SubmissionEntry[]
}
/** The count and percent of a specific option */
export interface APICountData {
  count: number,
  percent: number
}

/// RESPONSES

export interface APIDiscussionCreateResponse {
  id: number
}

export interface APISubmitCommentResponse {
  id: number
}

/// COMMENTS

export interface APIComment {
  id: number,
  creator: APIPlayer | null,
  content: string,
  timestamp: number
}


/// UI stuff that shouldn't belong here but its too late

export enum DiscussionState {
  PendingAnswer,
  Saving,
  SavedSuccess,
  SavedError
}

export interface BaseDiscussion extends APIDiscussion {
  state: DiscussionState,
  lastEditTime: number
}
export interface DiscussionRadio extends BaseDiscussion {
  type: APIDiscussionType.Radio,
  selected: APIDiscussionOption | null
}
export interface DiscussionMulti<T extends APIDiscussionType> extends BaseDiscussion {
  type: T,
  selected: APIDiscussionOption[]
}
export interface DiscussionText<T extends APIDiscussionType> extends BaseDiscussion {
  type: T
  value: string
}
export type Discussion = DiscussionRadio | DiscussionMulti<APIDiscussionType.Selection> | DiscussionMulti<APIDiscussionType.Checkbox> | DiscussionText<APIDiscussionType.LongText> | DiscussionText<APIDiscussionType.ShortText>

