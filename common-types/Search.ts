export type SearchType = "activity_log" | "user" | "note" | "ban" | "discuss" | "event"
interface BaseSearchResult {
    type: SearchType,
    id: string,
}
export interface ISearchPartialResult extends BaseSearchResult {
    content: string
}

export interface APISearchPartialResults {
    results: ISearchPartialResult[],
    timeTaken: number
}

export interface APISearchDetailResult<T extends object> extends BaseSearchResult {
    data: T,
    timeTaken: number
}