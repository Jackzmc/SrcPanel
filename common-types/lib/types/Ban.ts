export enum APIBanFlags {
  IPBan = 1,
  Suspended = 2,
  AppealBanned = 4
}

export interface APIBanPlayer {
  id: string,
  name?: string | null,
  nameResolver?: "stats" | "name_db" | "unknown" | "provider",
  provider?: string
}

export interface FullAPIBanPlayer extends APIBanPlayer {
  country?: string
}

export interface BaseAPIBan {
  id: number,
  client: APIBanPlayer
  reason?: string,
  publicReason?: string,
  flags: number,
  timestamp: number,
  executor: APIBanPlayer
  expires: number,
  expired: boolean,
  joinAttempts: number
}

export interface APIBan extends BaseAPIBan {
  client: FullAPIBanPlayer
  ip?: string,
  appeals?: APIBanAppeal[]
}
/** @deprecated use APIBan */
export type FullAPIBan = APIBan

export interface ListAPIBan extends BaseAPIBan {
  notesCount: number,
  appealsCount: number
}

export enum BanAppealState {
  Pending,
  Accepted,
  Rejected
}

export interface APIBanAppeal {
  id: number,
  state: BanAppealState,
  message: string,
  ip?: string,
  created: number,
  reject_reason?: string
  rejecter_id?: string
}
/** @deprecated use APIBanAppeal */
export type BanAppeal = APIBanAppeal

export interface APIBanResponse {
  bans: ListAPIBan[],
  totalBans: number
}
export interface APIBanDetailsResponse {
  meta: Record<string, number>,
  bans: FullAPIBan[],
  appeals: BanAppeal[]
}

export interface APICreateBanResponse {
  banId: number
  success: true
}