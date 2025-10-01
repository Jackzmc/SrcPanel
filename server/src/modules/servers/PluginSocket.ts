import { Socket } from 'net'
import { CommandResultType, LiveRecord, LiveRecordCommandResponse, LiveRecordClient, LiveRecordResponse, LiveRecordType, RecordDataType, RecordParseConfig } from '../../../../common-types/Live.js'
import Server from './Server.js'
import BufferReader from '../BufferReader.js'

/** How long to wait in milliseconds for a command response payload to be received */
const RESPONSE_TIMEOUT_MS = 1000 * 60
/** The number of milliseconds of no packets received to send a refresh */
const MIN_REFRESH_TIME_MS = 1000 * 60 * 60

export default class PluginSocket {
  #socket: Socket
  #server: Server | null
  #id: number
  
  #responseQueue: ((arg0: LiveRecordCommandResponse)=>void)[] = []
  
  constructor(socket: Socket) {
    this.#socket = socket
  }

  static ReadRecordField(reader: BufferReader, type: RecordDataType) {
    switch(type) {
      case RecordDataType.Byte: return reader.readByte()
      case RecordDataType.Short: return reader.readShort()
      case RecordDataType.Integer: return reader.readInt()
      case RecordDataType.Float: return reader.readFloat()
      case RecordDataType.String: return reader.readString()
      case RecordDataType.Boolean: return reader.readByte() != 0
    }
    // Same as above, but returns null if there is anymore data to read
    if(reader.isEOF) return null
    switch(type) {
      case RecordDataType.OptionalByte: return reader.readByte()
      case RecordDataType.OptionalShort: return reader.readShort()
      case RecordDataType.OptionalInteger: return reader.readInt()
      case RecordDataType.OptionalFloat: return reader.readFloat()
      case RecordDataType.OptionalString: return reader.readString()
      case RecordDataType.OptionalBoolean: return reader.readByte() != 0
    }
    throw new Error(`Unsupported record data type ${type}`)
  }

  /**
   * Parses data uses specification of RecordParseConfig
   * @param reader The buffer to read from
   * @returns 
   */
  static ParseRecord2(reader: BufferReader) {
    const type: LiveRecordType = reader.readByte()
    const record: Partial<LiveRecord> = {}
    const parseDefinition = RecordParseConfig[type]
    if(!parseDefinition) throw new Error(`unsupported record type ${LiveRecordType[type]}(${type}): no RecordParseConfig entry`)

    for(const [key, recType] of Object.entries(parseDefinition)) {
      if(Array.isArray(recType)) {
        // Loop every type in array, and map it back
        record[key] = recType.map(recTypeSub => {
          return PluginSocket.ReadRecordField(reader, recTypeSub)
        })
      } else {
        record[key] = PluginSocket.ReadRecordField(reader, recType)
      }
    }
    return record as LiveRecord
  }
  
  /**
   * Old manual parsing. TODO: remove replace
   * @param reader 
   * @deprecated
   */
  static ParseRecord(reader: BufferReader): LiveRecord {
    const type: LiveRecordType = reader.readByte()
    try {
      switch(type) {
        case LiveRecordType.Game: {
          return {
            type,
            startTime: reader.readInt(),
            campaignStartTime: reader.readInt(),
            difficulty: reader.readByte(),
            state: reader.readByte(),
            maxplayers: reader.readByte(),
            gamemode: reader.readString(),
            map: reader.readString(),
          } as LiveRecord
        }
        case LiveRecordType.Player: {
          const record: LiveRecordClient = {
            type,
            userid: reader.readInt(),
            steamid: reader.readString(),
            state: reader.readByte(),
            timestamp: reader.readInt(),
            name: reader.readString(),
          }
          return record
        }
        case LiveRecordType.Survivor: {
          return {
            type,
            userid: reader.readInt(),
            survivor: reader.readByte(),
            tempHealth: reader.readByte(),
            permHealth: reader.readByte(),
            flowPercent: reader.readByte(),
            states: reader.readInt(),
            move: reader.readInt(),
            action: reader.readInt(),
          }
        }
        case LiveRecordType.Infected: {
          return {
            type,
            userid: reader.readInt(),
            health: reader.readShort(),
            maxHealth: reader.readShort(),
            class: reader.readByte(),
            pinnedPlayerUserid: reader.readInt(),
          }
        }
        case LiveRecordType.Finale: {
          return {
            type,
            stage: reader.readByte(),
            escapeInProgress: reader.readByte() === 1
          }
        }
        case LiveRecordType.SurvivorItems: {
          return {
            type,
            userid: reader.readInt(),
            items: [reader.readString(), reader.readString(), reader.readString(), reader.readString(), reader.readString()]
          }
        }
        case LiveRecordType.CommandResponse: {
          const res: Partial<LiveRecordCommandResponse> = {
            type,
            id: reader.readByte(),
            resultType: reader.readByte(),
          }
          switch(res.resultType) {
            case CommandResultType.Boolean: 
              res.result = reader.readByte() > 0
              break
            case CommandResultType.Float:
              res.result = reader.readFloat()
              break
            default:
              res.result = reader.readInt()
          }
          res.message = reader.readString()
          return res as LiveRecordCommandResponse
        }
        case LiveRecordType.Meta: {
          return {
            type,
            steamConnected: reader.readByte() > 0
          }
        }
        case LiveRecordType.Auth: {
          const result = {
            type,
            version: reader.readByte(),
            token: reader.readString(),
            port: reader.readShort(),
            gameVersion: reader.readString(),
            appid: reader.readInt()
          }
          return result
        }
        default: {
          const parentDebug = reader.parent ? '\nparent: ' + reader.parent.toString('hex') : ''
          throw new Error(`Unknown record type: ${type}, offset ${reader.offset}\nbuffer:0x${reader.buffer.toString('hex')}${parentDebug}`)
        }
      }
    } catch(err) {
      const parentDebug = reader.parent ? '\nparent: ' + reader.parent.toString('hex') : ''
      throw new Error(`error reading record of type ${LiveRecordType[type]}(${type}) offset ${reader.offset}\n0x` + reader.buffer.toString('hex') + parentDebug + '\n' + err)
    }
  }
  
  public get Host() {
    return `${this.#socket.remoteAddress}:${this.#socket.remotePort}`
  }
  
  public get Authenticated() {
    return this.#server != undefined
  }
  
  public get Server() {
    return this.#server
  }
  
  _setServer(server: Server | null) {
    this.#server = server
  }

  /** Called when the plugin on the server connects
  *   Sends any data that the plugin needs 
  */
  async sendInit() {
    if(!this.#server) throw Error("sendInit() called with no server")
    this.send(LiveRecordResponse.OK, this.#server.WebsocketViewers)
    // Notify of whos connected to voice
    for(const user of this.#server.voiceMembers) {
      this.send(LiveRecordResponse.VoiceState, user.id, user.name, true)
    }
  }

  #refreshCheckTimeout: NodeJS.Timeout
  #lastRefreshTime: number

  /** Process an incoming record */
  onRecord(record: LiveRecord) {
    if(record.type === LiveRecordType.CommandResponse) {
      const cb = this.#responseQueue.shift()
      if(cb) cb(record)
      else console.error("PluginSocket: got command response but no callback is ready")
    } else {
      // Inform the admin panel server of record 
      this.#server?.Plugin?.pushRecord(record)

      // We use a timeout, as many records can come at once, including a game record. So we wait for a gap of a second
      if(record.type === LiveRecordType.Survivor && !this.#server?.Plugin?.liveStatus?.clients[record.userid.toString()]) {
        if(!this.#server?.Plugin?.liveStatus?.game && Date.now() - this.#lastRefreshTime > MIN_REFRESH_TIME_MS) {
          this.send(LiveRecordResponse.Refresh, record.userid)
        }
      }
      // Reset the refresh timer, so we only send refresh response on MIN_REFRESH_TIME ms of inactivity
      clearTimeout(this.#refreshCheckTimeout)
      this.#refreshCheckTimeout = setTimeout(() => {
        // If we have live status, but no game record, send a refresh if we haven't already
        if(this.#server?.Plugin?.liveStatus && !this.#server.Plugin?.liveStatus.game && Date.now() - this.#lastRefreshTime > MIN_REFRESH_TIME_MS) {
          console.info("[PluginSocket] No game packet, sending a Refresh response")
          this.send(LiveRecordResponse.Refresh)
        }
      }, 1000)
    }
  }
  /** Sends a OK packet, with a view count */
  send(type: LiveRecordResponse.OK, viewCount: number): Promise<void>;
  /** Sends a ERROR packet, with optional message */
  send(type: LiveRecordResponse.Error, message?: string): Promise<void>;
  /** Tells server to reconnect in a moment, for we are disconnecting or restarting */
  send(type: LiveRecordResponse.Reconnect): Promise<void>;
  /** Requests server to refresh a given userid or all users if none set  */
  send(type: LiveRecordResponse.Refresh, userid?: number): Promise<void>;
  /** Runs a game command or built in command on server  */
  send(type: LiveRecordResponse.RunCommand, command: string, namespace?: string): Promise<LiveRecordCommandResponse>;
  /** Updates if a user connects/disconnects from voice */
  send(type: LiveRecordResponse.VoiceState, voiceUserId: string, voiceName: string, connected: boolean): Promise<void>
  /** Send a live record response to the plugin */
  async send(type: LiveRecordResponse, arg1?: any, arg2?: any, arg3?: any): Promise<void | LiveRecordCommandResponse> {
    if(!this.Authenticated && type != LiveRecordResponse.OK && type != LiveRecordResponse.Error) {
      throw new Error("Not authenticated")
    }
    return new Promise((resolve, reject) => {
      // if(type == LiveRecordResponse.RunCommand) 
      //     length += arg.length + namespace.length 
      // if(type == LiveRecordResponse.Error && arg) length += arg.length
      const writer = BufferReader.new(2)
      writer.writeByte(type)
      const id = this.#id++
      switch(type) {
        case LiveRecordResponse.OK:
          writer.writeByte(arg1 ?? this.#server?.WebsocketViewers ?? 0)
          break
        case LiveRecordResponse.Error:
          writer.writeString(arg1 ?? "")
          break
        case LiveRecordResponse.RunCommand:
          writer.writeByte(id)
          writer.writeString(arg1)
          writer.writeString(arg2 ?? "")
          break
        case LiveRecordResponse.Refresh:
          writer.writeByte(arg1 ?? 0)
          this.#lastRefreshTime = Date.now()
          break
        case LiveRecordResponse.VoiceState:
          // args: voiceUserId: string, voiceName: string, connected: boolean
          writer.writeByte(arg3 ? 1 : 0) 
          writer.writeString(arg1)
          writer.writeString(arg2)
      }
      if(!this.#socket.write(writer.buffer)) return reject(new Error("Failed to write to socket"))
      if(type != LiveRecordResponse.RunCommand) return resolve()
      // For RunCommand, we wait for a response:
      const rejectTimeout = setTimeout(() => {
        reject(new Error("Response timed out"))
      }, RESPONSE_TIMEOUT_MS)
      this.#responseQueue.push((record) => {
        clearTimeout(rejectTimeout)
        resolve(record)
      })
      
    })
  }
}