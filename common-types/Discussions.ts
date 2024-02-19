export enum APIDiscussionFlags {
    None = 0,
    /** Should the avatars/names of those that responded be vsible **/
    RespondersPublic,
    /** Is not listed in main list, no more comments or responses can be made */
    Archived,
    /** Should the actual choices / response be visible? (Requires RespondersPublic) */
    ResponsesPublic
}

export enum APIDiscussionType {
    Radio,
    Checkbox,
    Selection,
    ShortText,
    LongText
}
export interface APIDiscussionBase {
    title: string,
    timestamp: number,
    closedAt?: number
    type: APIDiscussionType,
    description?: string,
    options: APIDiscussionOption[],
    flags: APIDiscussionFlags,
}

export interface APIDiscussionCacheableData extends APIDiscussionBase  {
    id: number,
    commentsCount: number
    creator: APIUser,
}

export interface APIDiscussion extends APIDiscussionCacheableData {
    responses: APIResponsesData,
    userSelection: number[]
}


export interface APIResponsesData {
    totalCount: number,
    percentVoted: number,
    counts: Record<string, APICountData> 
    users?: APIUser[]
}
export interface APICountData {
    count: number,
    percent: number
}
export interface APIDiscussionDetails extends APIDiscussion {
    comments: APIComment[]
}
export interface APIComment {
    id: number,
    creator: APIUser,
    content: string,
    timestamp: number
}
export interface APIUser {
    id: string,
    name: string
    avatarUrl: string
}
export interface APIDiscussionOption {
    id: number,
    label: string
}

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
    text: string
}
export type Discussion = DiscussionRadio | DiscussionMulti<APIDiscussionType.Selection> |  DiscussionMulti<APIDiscussionType.Checkbox> | DiscussionText<APIDiscussionType.LongText> | DiscussionText<APIDiscussionType.ShortText>
export type DiscussionDetailed = Discussion & APIDiscussionDetails