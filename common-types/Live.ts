export interface StatusFinaleInfo {
    escapeLeaving: boolean
    finaleStage: FinaleStage
}

export const enum PlayerState {
    None = 0,
    Alive = 32,
    BlackAndWhite = 1,
	InSaferoom = 2,
	IsCalm = 4,
	IsBoomed = 8,
    IsPinned = 16
}

export const enum PlayerMove {
    UnderAttack = -3,
    Hanging = -2,
    Incapped = -1,
    Idle = 0,
    Walk = 1,
    Run = 2,
    Crouched = 3,
    Ladder = 4
}

export enum PlayerGameAction {
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

export const enum SurvivorId {
    Nick = 0,
    Rochelle = 1,
    Coach = 2,
    Ellis = 3,
    Bill = 4,
    Francis = 6,
    Zoey = 5,
    Louis = 7,
}

export const enum InfectedClass {
    Smoker = 1,
    Boomer = 2,
    Hunter = 3,
    Spitter = 4,
    Jockey = 5,
    Charger = 6,
    Witch = 7,
    Tank = 8,
}

export const enum FinaleStage {
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

export enum LiveRecordType {
    Game,
    Player,
    Survivor,
    Infected,
    Finale,
	SurvivorItems
}

export const enum GameDifficulty {
    Easy,
    Normal,
    Advanced,
    Expert
}

export interface LiveRecordGame extends BaseLiveRecord {
    type: LiveRecordType.Game,
    startTime: number,
    campaignStartTime: number,
    difficulty: GameDifficulty,
    inTransition: boolean,
    map: string,
    gamemode: string
}

export interface LiveRecordPlayer extends BaseLiveRecord {
    type: LiveRecordType.Player,
    userid: number
    steamid: string,
    // Undefined if player has disconnected
    isIdle?: boolean,
    joinTime?: number,
    name?: string,
}

export interface LiveRecordSurvivor extends BaseLiveRecord {
    type: LiveRecordType.Survivor,
    // player: LivePlayer,
    userid: number,
    survivor: SurvivorId,
    tempHealth: number,
    permHealth: number,
    flowPercent: number,
    states: PlayerState
    move: PlayerMove,
    action: PlayerGameAction
}

export interface LiveRecordInfected extends BaseLiveRecord {
    type: LiveRecordType.Infected,
    // player: LivePlayer,
    userid: number
    health: number,
    maxHealth: number,
    class: InfectedClass,
    pinnedPlayerUserid: number,
}

export interface LiveRecordFinaleInfo extends BaseLiveRecord {
    type: LiveRecordType.Finale,
    stage: FinaleStage
    escapeInProgress: boolean
}

export interface LiveRecordSurvivorItems extends BaseLiveRecord {
    type: LiveRecordType.SurvivorItems,
    userid: number
    items: [string,string,string,string,string]
}

export type LiveRecord = LiveRecordGame | LiveRecordPlayer | LiveRecordSurvivor | LiveRecordInfected | LiveRecordFinaleInfo | LiveRecordSurvivorItems

export interface BaseLiveRecord {
    type: LiveRecordType
}

export interface LivePlayerSurvivor extends LiveRecordPlayer {
    survivor: LiveRecordSurvivor,
    items: [string,string,string,string,string],
    isAlive: boolean,
}

export interface LivePlayerInfected extends LiveRecordPlayer {
    infected: LiveRecordInfected,
    isAlive: boolean,
    pinnedPlayer?: LivePlayerFull
}

export type LivePlayerFull = LivePlayerSurvivor | LivePlayerInfected

export const enum LiveRecordResponse {
    OK,
    Reconnect,
    Error,
    Refresh
}

export interface LiveDataCache {
    game: LiveRecordGame,
    players: Record<string, LivePlayerFull>, // key is userid as string
    finale?: LiveRecordFinaleInfo,
    lastUpdate: number
}

export function updateLiveCache(cache: LiveDataCache | undefined, record: LiveRecord): LiveDataCache {
    if(!cache) cache = {
        lastUpdate: 0,
        players: {},
        game: null
    }
    cache.lastUpdate = Date.now()
    // If we get any other record, but we don't have the game we just ignore it
    switch(record.type) {
        case LiveRecordType.Game:
            cache.game = record
            if(cache.game.inTransition) {
                cache.players = {}
            }
            break
        case LiveRecordType.Player:
            if(record.joinTime == undefined) {
                // Player disconnected, wipe them
                delete cache.players[record.userid.toString()]
            } else {
                // Updated player info, merge it on top of old data (to preserve infected/survivor info)
                const id = record.userid.toString()
                cache.players[id] = {
                    ...cache.players[id],
                    ...record
                }
            }
            break
        case LiveRecordType.Survivor: {
            let player = cache.players[record.userid.toString()] as LivePlayerSurvivor
            if(!player) return cache
            player.survivor = record
            //@ts-expect-error remove old property
            player.infected = undefined
            // isAlive is checked a lot, so we just split it out
            player.isAlive = (record.states & PlayerState.Alive) != 0
            break
        }
        case LiveRecordType.Infected: {
            let player = cache.players[record.userid.toString()] as LivePlayerInfected
            if(!player) return cache
            //@ts-expect-error remove old property
            player.survivor = undefined
            //@ts-expect-error remove old property
            player.items = undefined
            player.infected = record
            // isAlive is checked a lot, so we just split it out
            player.isAlive = record.health > 0
            if(record.pinnedPlayerUserid) {
                player.pinnedPlayer = cache.players[record.pinnedPlayerUserid.toString()]
            }
            break
        }
        case LiveRecordType.Finale: {
            cache.finale = record as LiveRecordFinaleInfo
            break
        }
        case LiveRecordType.SurvivorItems: {
            let player = cache.players[record.userid.toString()] as LivePlayerSurvivor
            if(!player) return cache
            if(!player.items) player.items = ["","","","",""]
            player.items = record.items
            break
        }
    }
    return cache
}