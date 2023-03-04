export enum APIBanFlags {
    IPBan = 1,
    Suspended = 2
}

export interface APIBanPlayer {
    id: string,
    name?: string,
    nameResolver?: "stats" | "name_db" | "unknown",
    source?: string
}

export interface FullAPIBanPlayer extends APIBanPlayer {
    country?: string
}

export interface BaseAPIBan {
    id: number,
    client: APIBanPlayer
    reason?: string,
    publicReason: string,
    flags: number,
    timestamp: number,
    executor: APIBanPlayer
    expires: number,
    expired: boolean,
    joinAttempts: number
}

export interface FullAPIBan extends BaseAPIBan {
    client: FullAPIBanPlayer
    ip?: string,
    appeals?: BanAppeal[]
}

export interface ListAPIBan extends BaseAPIBan {
    notesCount: number,
    appealsCount: number
}

export enum BanAppealState {
    Pending,
    Accepted,
    Rejected
}

export interface BanAppeal {
    id: number,
    state: BanAppealState,
    message: string,
    ip?: string, 
    created: number,
    reject_reason?: string
    rejecter_id?: string
}