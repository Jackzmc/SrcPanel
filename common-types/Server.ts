

export interface StatusFinaleInfo {
    escapeLeaving: boolean
    finaleStage: FinaleStage
}

export interface PluginServerStatus {
    lastUpdateTime: number
    refreshInterval: number,
    playerCount: number;
    map: string;
    gamemode: string;
    players: StatusPlayer[];
    finaleInfo?: StatusFinaleInfo
}

export interface BaseStatusPlayer {
    steamid: string;
    name: string;
    team: number;
    isAlive: boolean;
    permHealth: number;
}

export interface StatusPlayerSurvivor extends BaseStatusPlayer {
    tempHealth: number;
    idlePlayer?: string;
    flow: number;
    survivor: SurvivorId;
    weapons?: ( null | string )[];
    isPinned: boolean
}

export interface StatusPlayerInfected extends BaseStatusPlayer {
    class: InfectedClass;
    pinnedSurvivor?: string
}

export type StatusPlayer = StatusPlayerSurvivor | StatusPlayerInfected

export enum SurvivorId {
    Nick = 0,
    Rochelle = 1,
    Coach = 2,
    Ellis = 3,
    Bill = 4,
    Francis = 6,
    Zoey = 5,
    Louis = 7,
}

export enum InfectedClass {
    Smoker = 1,
    Boomer = 2,
    Hunter = 3,
    Spitter = 4,
    Jockey = 5,
    Charger = 6,
    Witch = 7,
    Tank = 8,
}

export enum FinaleStage {
    Gauntlet = 0,
    HordeWave1 = 1,
    FirstBoss = 2,
    Gauntlet2 = 3,
    HordeWave2 = 4,
    FinalBoss = 5,
    HordeEscape = 6,
    CustomPanic = 7,
    CustomTank = 8,
    CustomScripted = 9,
    CustomDelay = 10,
    CustomClearout = 11,
    GauntletStart = 12,
    GauntletHorde = 13,
    GauntletHordeBonusTime = 14,
    GauntletHordeBossIncoming = 15,
    GauntletBoss = 16,
    GauntletEscape = 17,
};