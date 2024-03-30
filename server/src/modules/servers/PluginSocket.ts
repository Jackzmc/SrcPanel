import { Socket } from 'net'
import { CommandResultType, LiveRecord, LiveRecordCommandResponse, LiveRecordPlayer, LiveRecordResponse, LiveRecordType } from '../../../../common-types/Live.js'
import Server from './Server.js'
import BufferReader from '../BufferReader.js'
import JWT from '../../jwt-promise.js'

const RESPONSE_TIMEOUT = 1000 * 60

export default class PluginSocket {
  #socket: Socket
  #server: Server
  #id: number
  
  #responseQueue: ((arg0: LiveRecordCommandResponse)=>void)[] = []
  
  constructor(socket: Socket) {
    this.#socket = socket
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
          throw new Error("Not Implemented type: " + type)
        }
      }
    } catch(err) {
      throw new Error(`error reading record of type ${LiveRecordType[type]}(${type})\n` + reader.buffer.toString('hex') + "\n" + err)
    }
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
  
  onRecord(record: LiveRecord) {
    if(record.type === LiveRecordType.CommandResponse) {
      const cb = this.#responseQueue.shift()
      if(cb) cb(record)
      else console.error("PluginSocket: got command response but no callback is ready")
    } else {
      this.#server.pushLiveRecord(record)
    }
  }
  
  send(type: LiveRecordResponse.OK, viewCount: number): Promise<void>;
  send(type: LiveRecordResponse.Error, message?: string): Promise<void>;
  send(type: LiveRecordResponse.Reconnect): Promise<void>;
  send(type: LiveRecordResponse.Refresh): Promise<void>;
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
      }
      if(!this.#socket.write(writer.buffer)) return reject(new Error("Failed to write to socket"))
      if(type != LiveRecordResponse.RunCommand) return resolve()
      // For RunCommand, we wait for a response:
      let rejectTimeout = setTimeout(() => {
        reject("Response timed out")
      }, RESPONSE_TIMEOUT)
      this.#responseQueue.push((record) => {
        clearTimeout(rejectTimeout)
        resolve(record)
      })
      
    })
  }
}