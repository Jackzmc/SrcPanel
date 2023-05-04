
export interface ShareData {
    id: string,
    name?: string,
    sourceFolder: string,
    steamAppid?: number,
    allowedExts: string[],
    downloadSources: DownloadSourceRecord,
    destinations: Record<string, ShareDestData>
}

export interface ShareDestData {
    name?: string,
    path: string,
    serverIds: string[]
}

export interface ShareDestination {
    id: string,
    name?: string,
    serverIds?: string[],
    path: string
}

export interface ShareInfo {
    id: string,
    sourceFolder: string;
    destinations: ShareDestination[],
    appid?: number,
    name: string,
    fileExts?: string[],
    downloadSources?: DownloadSourceRecord
}

export interface AddonInfo {
    filename: string,
    filesize?: number,
    downloaded?: number
    lastModified?: number,
    workshop?: AddonWorkshopInfo,
    installInfo: Record<string, boolean>,
    collection?: WorkshopCollectionInfo
}

export interface AddonCollectionInfo {
    collection: WorkshopCollectionInfo, 
    children: AddonInfo[]
}
export interface AddonWorkshopInfo {
    publishedfileid: number
    deleted: boolean,
    title: string,
    filesize: number,
    fileUrl: string,
    previewUrl: string,
    description: string,
    lastUpdated: number
}

export interface AddonInstallInfo {
    states: Record<string, boolean>, 
    created: number,
    modified: number,
    size: number
}

export const enum DownloadSourceE {
    DirectUpload = 1,
    SteamWorkshop = 2
}
export type DownloadSourceRecord = Partial<Record<DownloadSourceE, boolean>>

export interface ChildWorkshopItem extends WorkshopItem {
    collection?: WorkshopCollectionInfo
}
export interface WorkshopCollectionInfo {
    id: string,
    name: string
}

export interface SteamUserDetails {
    steamid: string;
    communityvisibilitystate: number;
    profilestate: number;
    personaname: string;
    profileurl: string;
    avatar: string;
    avatarmedium: string;
    avatarfull: string;
    avatarhash: string;
    lastlogoff: number;
    personastate: number;
    primaryclanid: string;
    timecreated: number;
    personastateflags: number;
    loccountrycode: string;
    locstatecode: string;
}

export interface WorkshopItem {
    result: number,
    publishedfileid: string,
    creator: string,
    creator_app_id: number,
    consumer_app_id: number,
    filename: string,
    file_size: number,
    file_url: string,
    preview_url: string,
    hcontent_preview: string,
    title: string,
    description: string,
    time_created: number,
    time_updated: number,
    subscriptions: number,
    favorited: number,
    views: number,
    tags: {
        tag: string
    }[]
}