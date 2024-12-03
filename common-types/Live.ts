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

export const enum PlayerGameAction {
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
	SurvivorItems,
    CommandResponse,
    Auth,
    Meta
}

export const enum GameDifficulty {
    Easy = 0,
    Normal = 1,
    Advanced = 2,
    Expert = 3
}
export const GAME_DIFFICULTY_STRINGS = ["easy", "normal", "advanced", "expert"]

export enum RecordDataType {
    Byte,
    Short,
    Integer,
    Float,
    String,
    Boolean,

    OptionalByte,
    OptionalShort,
    OptionalInteger,
    OptionalFloat,
    OptionalString,
    OptionalBoolean,
}


export type RecordParserInterface<T> = Record<keyof T, RecordDataType | RecordDataType[]>

export const RecordGameParseDef: RecordParserInterface<LiveRecordGame> = {
    type: RecordDataType.Byte,
    startTime: RecordDataType.Integer,
    campaignStartTime: RecordDataType.Integer,
    difficulty: RecordDataType.Byte,
    state: RecordDataType.Byte,
    maxplayers: RecordDataType.Byte,
    map: RecordDataType.String,
    gamemode: RecordDataType.String,
}

export interface LiveRecordGame extends BaseLiveRecord {
    type: LiveRecordType.Game,
    startTime: number,
    campaignStartTime: number,
    difficulty: GameDifficulty,
    state: GameState,
    maxplayers: number,
    map: string,
    gamemode: string,
}

export const RecordPlayerParseDef: RecordParserInterface<LiveRecordClient> = {
    type: RecordDataType.Byte,
    userid: RecordDataType.Integer,
    steamid: RecordDataType.String,
    state: RecordDataType.Byte,
    timestamp: RecordDataType.Byte,
    name: RecordDataType.String
}

export interface LiveRecordClient extends BaseLiveRecord {
    type: LiveRecordType.Player,
    userid: number
    steamid: string,
    state: ClientState,
    timestamp: number,
    name: string,
}

export const RecordSurvivorParseDef: RecordParserInterface<LiveRecordSurvivor> = {
    type: RecordDataType.Byte,
    userid: RecordDataType.Integer,
    survivor: RecordDataType.Byte,
    tempHealth: RecordDataType.Byte,
    permHealth: RecordDataType.Byte,
    flowPercent: RecordDataType.Byte,
    states: RecordDataType.Byte,
    move: RecordDataType.Byte,
    action: RecordDataType.Byte
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

export const RecordInfectedParseDef: RecordParserInterface<LiveRecordInfected> = {
    type: RecordDataType.Byte,
    userid: RecordDataType.Integer,
    health: RecordDataType.Byte,
    maxHealth: RecordDataType.Byte,
    class: RecordDataType.Byte,
    pinnedPlayerUserid: RecordDataType.Integer,
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

export const RecordFinaleInfoParseDef: RecordParserInterface<LiveRecordFinaleInfo> = {
    type: RecordDataType.Byte,
    stage: RecordDataType.Byte,
    escapeInProgress: RecordDataType.Boolean
}

export interface LiveRecordFinaleInfo extends BaseLiveRecord {
    type: LiveRecordType.Finale,
    stage: FinaleStage
    escapeInProgress: boolean
}

export const RecordSurvivorItemsParseDef: RecordParserInterface<LiveRecordSurvivorItems> = {
    type: RecordDataType.Byte,
    userid: RecordDataType.Integer,
    items: [RecordDataType.String, RecordDataType.String, RecordDataType.String, RecordDataType.String, RecordDataType.String]
}

export interface LiveRecordSurvivorItems extends BaseLiveRecord {
    type: LiveRecordType.SurvivorItems,
    userid: number
    items: [string,string,string,string,string]
}

export enum CommandResultType {
    Error = -1,
    None,
    Boolean,
    Integer,
    Float
}

export const RecordCommandResponseParseDef: RecordParserInterface<LiveRecordCommandResponse> = {
    type: RecordDataType.Byte,
    id: RecordDataType.Byte,
    resultType: RecordDataType.Byte,
    result: RecordDataType.Byte,
    message: RecordDataType.OptionalString
}

export interface LiveRecordCommandResponse {
    type: LiveRecordType.CommandResponse,
    id: number,
    resultType: CommandResultType,
    result: number | boolean,
    message?: string
}

export const RecordAuthParseDef: RecordParserInterface<LiveRecordAuth> = {
    type: RecordDataType.Byte,
    version: RecordDataType.Byte,
    token: RecordDataType.String,
    port: RecordDataType.OptionalShort,
    gameVersion: RecordDataType.OptionalString
}

export interface LiveRecordAuth {
    type: LiveRecordType.Auth,
    version: number,
    token: string,
    port: number,
    gameVersion: string | null
}

export const RecordMetaParseDef: RecordParserInterface<LiveRecordMeta> = {
    type: RecordDataType.Byte,
    steamConnected: RecordDataType.Boolean,
}

export interface LiveRecordMeta {
    type: LiveRecordType.Meta,
    steamConnected: boolean
}

export type LiveRecord = LiveRecordGame | LiveRecordClient | LiveRecordSurvivor | LiveRecordInfected | LiveRecordFinaleInfo | LiveRecordSurvivorItems | LiveRecordCommandResponse | LiveRecordMeta | LiveRecordAuth
export interface BaseLiveRecord {
    type: LiveRecordType
}


export const RecordParseConfig: Record<LiveRecordType, RecordParserInterface<BaseLiveRecord>> = {
    [LiveRecordType.Game]: RecordGameParseDef,
    [LiveRecordType.Player]: RecordPlayerParseDef,
    [LiveRecordType.Survivor]: RecordSurvivorParseDef,
    [LiveRecordType.SurvivorItems]: RecordSurvivorItemsParseDef,
    [LiveRecordType.Infected]: RecordInfectedParseDef,
    [LiveRecordType.Finale]: RecordFinaleInfoParseDef,
    [LiveRecordType.Meta]: RecordMetaParseDef,
    [LiveRecordType.Auth]: RecordAuthParseDef,
    [LiveRecordType.CommandResponse]: RecordCommandResponseParseDef
}

export const enum LiveRecordResponse {
    OK, // OK(byte) ViewCount(byte)
    Reconnect,
    Error,
    Refresh,
    RunCommand // RunCommand(byte) id(number) command(string)
}

export enum GameState {
    None = 0,
    Transitioning = 1,
    Hibernating = 2,
    NewGame
}

export enum ClientState {
    Normal = 0,
    Connected = 1,
    Disconnected = 2,
    Idle = 3
}


export interface LiveDataCache {
    game: LiveRecordGame | null,
    clients: Record<string, LiveClient>, // key is userid as string
    finale?: LiveRecordFinaleInfo,
    lastUpdate: number,
}

export interface LiveSurvivor extends LiveRecordSurvivor {
    items?: [string,string,string,string,string],
}

export interface LiveInfected extends LiveRecordInfected {
    pinnedPlayer?: LiveClient
}

export interface LiveClient extends LiveRecordClient {
    infected?: LiveInfected,
    survivor?: LiveSurvivor,
    isAlive: boolean,
    totalHealth: number
} 


export function updateLiveCache(cache: LiveDataCache | null, record: LiveRecord): LiveDataCache {
    if(!cache) cache = {
        lastUpdate: 0,
        clients: {},
        game: null,
    }
    cache.lastUpdate = Date.now()
    // If we get any other record, but we don't have the game we just ignore it
    switch(record.type) {
        case LiveRecordType.Game:
            if(record.state === GameState.NewGame) {
                cache.clients = {}
            } else if(cache.game) {
                // From transition -> none, remove cached clients
                if(cache.game.state == GameState.Transitioning && record.state != GameState.Transitioning) {
                    cache.clients = {}
                }
            }
            cache.game = record
            // Start time of 0 is end of game
            console.log("game record", `state=${record.state} maxplayers=${record.maxplayers} players=${Object.keys(cache.clients)}`)
            // if(record.startTime == 0 || cache.game.state != GameState.None) {
                // cache.clients = {}
            // }
            
            break
        case LiveRecordType.Player:
            const id = record.userid.toString()
            if(record.state == ClientState.Disconnected) {
                // Player disconnected, wipe them
                delete cache.clients[id]
            } else if(record.state == ClientState.Connected || !cache.clients[id]) {
                cache.clients[id] = { ...record, isAlive: true, totalHealth: 100 }
            } else {
                // Updated player info, merge it on top of old data (to preserve infected/survivor info)
                cache.clients[id] = {
                    ...cache.clients[id],
                    ...record
                }
            }
            break
        case LiveRecordType.Survivor: {
            let client = cache.clients[record.userid.toString()]
            if(!client) {
                console.debug("got survivor but no player", record.userid)
                return cache
            }
            delete client.infected
            client.survivor = { 
                // DefaultS:
                items: ["","","","",""],
                // Merge onto previous data
                ...client,
                // New data:
                ...record, 
                
            } 
            client.totalHealth = record.permHealth + record.tempHealth,
            client.isAlive = (record.states & PlayerState.Alive) !== 0
            break
        }
        case LiveRecordType.Infected: {
            let client = cache.clients[record.userid.toString()]
            if(!client) return cache
            delete client.survivor
            client.infected = {
                ...record,
                pinnedPlayer: record.pinnedPlayerUserid ? cache.clients[record.pinnedPlayerUserid.toString()] : undefined
            }
            client.totalHealth = 100 * record.health / record.maxHealth
            client.isAlive = record.health > 0
            break
        }
        case LiveRecordType.Finale: {
            cache.finale = record as LiveRecordFinaleInfo
            break
        }
        case LiveRecordType.SurvivorItems: {
            let client = cache.clients[record.userid.toString()]
            if(!client?.survivor) return cache
            client.survivor.items = record.items
            break
        }
    }
    return cache
}

export interface PluginTokenPayload {
    sub: string, // server id
    iat: number, // issued,
    iss?: string,
    docker?: boolean
}