

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
    finaleInfo?: StatusFinaleInfo,
    fps: number,
    startTime: number
}

export interface BaseStatusPlayer {
    steamid: string;
    name: string;
    team: number;
    isAlive: boolean;
    permHealth: number;
    states: number // see PlayerState;
}

export interface StatusPlayerSurvivor extends BaseStatusPlayer {
    tempHealth: number;
    idlePlayerId?: string;
    idlePlayer?: BaseStatusPlayer
    flow: number;
    flowProgress: number,
    survivor: SurvivorId;
    weapons: ( null | string )[];
    isPinned: boolean,
}

export interface StatusPlayerInfected extends BaseStatusPlayer {
    class: InfectedClass;
    pinnedSurvivor?: string
}

export type StatusPlayer = StatusPlayerSurvivor | StatusPlayerInfected

export enum PlayerState {
	Alive = 0,
	Idle = 1,
	Walking = 2,
	Running = 4,
	Crouched = 8,
	Incapped = 16,
	BlackAndWhite = 32,
    InSaferoom = 64
}

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
    Gauntlet_ = 18,
};

export const FinaleStageName: Record<FinaleStage, string> = {
    [FinaleStage.Gauntlet]: "Gauntlet",
    [FinaleStage.Gauntlet_]: "Gauntlet",
    [FinaleStage.Gauntlet2]: "Gauntlet",
    [FinaleStage.HordeWave1]: "Horde Wave",
    [FinaleStage.FirstBoss]: "First Tank",
    [FinaleStage.GauntletHorde]: "Gauntlet: Horde",
    [FinaleStage.GauntletHordeBonusTime]: "Gauntlet: Over Time",
    [FinaleStage.GauntletHordeBossIncoming]: "Gauntlet: Tank Incoming",
    [FinaleStage.GauntletBoss]: "Gauntlet: Tank",
    [FinaleStage.GauntletEscape]: "Gauntlet: Escape",
    [FinaleStage.GauntletStart]: "Gauntlet",
    [FinaleStage.HordeWave2]: "Horde Wave",
    [FinaleStage.FinalBoss]: "Final Boss",
    [FinaleStage.CustomPanic]: "Panic",
    [FinaleStage.CustomTank]: "Tank",
    [FinaleStage.CustomScripted]: "Scripted",
    [FinaleStage.CustomDelay]: "Intermission",
    [FinaleStage.CustomClearout]: "Clearout",
    [FinaleStage.HordeEscape]: "Horde Escape",
}