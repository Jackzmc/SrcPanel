import { Socket } from 'net'
import { CommandResultType, LiveRecord, LiveRecordCommandResponse, LiveRecordGame, LiveRecordPlayer, LiveRecordResponse, LiveRecordType, RecordGameParseDef, RecordDataType, RecordParseConfig } from '../../../../common-types/Live.js'
import Server from './Server.js'
import BufferReader from '../BufferReader.js'
import JWT from '../../jwt-promise.js'

const RESPONSE_TIMEOUT = 1000 * 60
const MIN_REFRESH_TIME = 1000 * 60 * 60

export default class PluginSocket {
  #socket: Socket
  #server: Server
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
          let record: LiveRecordPlayer = {
            type,
            userid: reader.readInt(),
            steamid: reader.readString()
          }
          if(!reader.isEOF) {
            record = {
              ...record,
              isIdle: reader.readByte() == 1,
              joinTime: reader.readInt(),
              name: reader.readString(),
            } as LiveRecordPlayer
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
          let res: Partial<LiveRecordCommandResponse> = {
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
          return {
            type,
            version: reader.readByte(),
            token: reader.readString()
          }
        }
        default: {
        }
      }
    } catch(err) {
      const parentDebug = reader.parent ? '\nparent: ' + reader.parent.toString('hex') : ''
      throw new Error(`error reading record of type ${LiveRecordType[type]}(${type}) offset ${reader.offset}\n0x` + reader.buffer.toString('hex') + parentDebug + '\n' + err)
    }
    const parentDebug = reader.parent ? '\nparent: ' + reader.parent.toString('hex') : ''
    throw new Error(`Unknown record type: ${type}, offset ${reader.offset}\nbuffer:0x${reader.buffer.toString('hex')}${parentDebug}`)
  }
  
  public get IP() {
    return this.#socket.remoteAddress
  }
  
  public get Authenticated() {
    return this.#server != undefined
  }
  
  public get Server() {
    return this.#server
  }
  
  _setServer(server: Server) {
    this.#server = server
  }

  #refreshCheckTimeout: NodeJS.Timeout
  #lastRefreshTime: number
  
  onRecord(record: LiveRecord) {
    if(record.type === LiveRecordType.CommandResponse) {
      const cb = this.#responseQueue.shift()
      if(cb) cb(record)
      else console.error("PluginSocket: got command response but no callback is ready")
    } else {
      this.#server.pushLiveRecord(record)
      // We use a timeout as many records can come at once, including a game record. So we wait for a gap of a second
      if(record.type === LiveRecordType.Survivor && !this.#server.liveStatus.players[record.userid.toString()]) {
        if(!this.#server.liveStatus.game && Date.now() - this.#lastRefreshTime > MIN_REFRESH_TIME) {
          this.send(LiveRecordResponse.Refresh, record.userid)
        }
      }
      clearTimeout(this.#refreshCheckTimeout)
      this.#refreshCheckTimeout = setTimeout(() => {
        // If we have live status, but no game record, send a refresh if we haven't already
        if(this.#server?.liveStatus && !this.#server.liveStatus.game && Date.now() - this.#lastRefreshTime > MIN_REFRESH_TIME) {
          console.info("[PluginSocket] No game packet, sending a Refresh response")
          this.send(LiveRecordResponse.Refresh)
        }
      }, 1000)
    }
  }
  
  send(type: LiveRecordResponse.OK, viewCount: number): Promise<void>;
  send(type: LiveRecordResponse.Error, message?: string): Promise<void>;
  send(type: LiveRecordResponse.Reconnect): Promise<void>;
  send(type: LiveRecordResponse.Refresh, userid?: number): Promise<void>;
  send(type: LiveRecordResponse.RunCommand, command: string, namespace?: string): Promise<LiveRecordCommandResponse>;
  async send(type: LiveRecordResponse, arg?: any, namespace?: string): Promise<void | LiveRecordCommandResponse> {
    if(!this.Authenticated && type != LiveRecordResponse.OK && type != LiveRecordResponse.Error) {
      throw new Error("Not authenticated")
    }
    return new Promise((resolve, reject) => {
      // if(type == LiveRecordResponse.RunCommand) 
      //     length += arg.length + namespace.length 
      // if(type == LiveRecordResponse.Error && arg) length += arg.length
      const writer = BufferReader.new(2)
      writer.writeByte(type)
      let id = this.#id++
      switch(type) {
        case LiveRecordResponse.OK:
          writer.writeByte(arg ?? this.#server?.liveViewers ?? 0)
          break
        case LiveRecordResponse.Error:
          writer.writeString(arg ?? "")
          break
        case LiveRecordResponse.RunCommand:
          writer.writeByte(id)
          writer.writeString(arg)
          writer.writeString(namespace ?? "")
          break
        case LiveRecordResponse.Refresh:
          writer.writeByte(arg ?? 0)
          this.#lastRefreshTime = Date.now()
          break
      }
      if(!this.#socket.write(writer.buffer)) return reject(new Error("Failed to write to socket"))
      if(type != LiveRecordResponse.RunCommand) return resolve()
      // For RunCommand, we wait for a response:
      let rejectTimeout = setTimeout(() => {
        reject(new Error("Response timed out"))
      }, RESPONSE_TIMEOUT)
      this.#responseQueue.push((record) => {
        clearTimeout(rejectTimeout)
        resolve(record)
      })
      
    })
  }
}