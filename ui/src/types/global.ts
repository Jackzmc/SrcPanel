export enum LoadState {
  Idle = -1,
  Loading,
  Success,
  Error,
  Updating
}
export interface FetchData<T> {
  data: T | null | undefined,
  loadState: LoadState,
  errorReason?: string,
  editing?: boolean
}

export const GetDefaultFetchData = () => JSON.parse(JSON.stringify({
  data: null,
  loadState: LoadState.Loading,
  editing: false
}))
