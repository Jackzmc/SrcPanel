

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
    startTime: number,
    commonsCount: number
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
    idlePlayerId?: string;
    idlePlayer?: BaseStatusPlayer
    flow: number;
    flowProgress: number,
    survivor: SurvivorId;
    weapons: ( null | string )[];
    isPinned: boolean,
    states: PlayerState
    move: PlayerMove,
    action: PlayerAction
}

export interface StatusPlayerInfected extends BaseStatusPlayer {
    class: InfectedClass;
    pinnedSurvivorId?: string,
    pinnedSurvivor?: StatusPlayerSurvivor
    maxHealth: number
}

export type StatusPlayer = StatusPlayerSurvivor | StatusPlayerInfected

export enum PlayerState {
    BlackAndWhite = 1,
	InSaferoom = 2,
	IsCalm = 4,
	IsBoomed = 8
}

export enum PlayerMove {
    UnderAttack = -3,
    Hanging = -2,
    Incapped = -1,
    Idle = 0,
    Walk = 1,
    Run = 2,
    Crouched = 3,
    Ladder = 4
}

export enum PlayerAction {
    BeingHealed      = -1,
    None				= 0,	// No use action active
    Healing			= 1,	// Includes healing yourself or a teammate.
    AmmoPack			= 2,	// When deploying the ammo pack that was never added into the game
    DefibDefibing			= 4,	// When defib'ing a dead body.
    GettingDefibed	= 5,	// When comming back to life from a dead body.
    DeployIncendiary	= 6,	// When deploying Incendiary ammo
    DeployExplosive	= 7,	// When deploying Explosive ammo
    PouringGas		= 8,	// Pouring gas into a generator
    Cola				= 9,	// For Dead Center map 2 cola event, when handing over the cola to whitalker.
    Button			= 10,	// Such as buttons, timed buttons, generators, etc.
    UsePointScript	= 11	// When using a "point_script_use_target" entity
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
    Unknown = 18,
};