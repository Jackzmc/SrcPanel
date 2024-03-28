import { Socket } from 'net'
import { LiveRecordCommandResponse, LiveRecordResponse } from '../../../../common-types/Live.js'
import Server from './Server.js'
import BufferReader from '../BufferReader.js'
import EventEmitter from 'events'

const RESPONSE_TIMEOUT = 1000 * 60

export default class PluginSocket {
    #socket: Socket
    #server: Server
    #id: number

    #responseQueue: ((arg0: LiveRecordCommandResponse)=>void)[] = []

    constructor(socket: Socket) {
        this.#socket = socket
    }

    public get isAuthenticated() {
        return true
    }

    _setServer(server: Server) {
        this.#server = server
    }

    onRecord(record: LiveRecordCommandResponse) {
        const cb = this.#responseQueue.shift()
        if(cb) cb(record)
    }

    send(type: LiveRecordResponse.OK, viewCount: number): Promise<void>;
    send(type: LiveRecordResponse.Error, message?: string): Promise<void>;
    send(type: LiveRecordResponse.Reconnect): Promise<void>;
    send(type: LiveRecordResponse.Refresh): Promise<void>;
    send(type: LiveRecordResponse.RunCommand, command: string): Promise<LiveRecordCommandResponse>;
    async send(type: LiveRecordResponse, arg?: any): Promise<void | LiveRecordCommandResponse> {
        return new Promise((resolve, reject) => {
            let length = 2
            if(type == LiveRecordResponse.RunCommand) length += arg.length
            const writer = BufferReader.new(length)
            writer.writeByte(type)
            let id = this.#id++
            switch(type) {
                case LiveRecordResponse.OK:
                    writer.writeByte(this.#server?.liveViewers ?? 0)
                    break
                case LiveRecordResponse.Error:
                    writer.writeString(arg)
                    break
                case LiveRecordResponse.RunCommand:
                    writer.writeByte(id)
                    writer.writeString(arg)
                    break
            }
            if(!this.#socket.write(writer.buffer)) return reject(new Error("Failed to write to socket"))
            if(type != LiveRecordResponse.RunCommand) return resolve()
            // For RunCommand, we wait for a response:
            this.#responseQueue.push((record) => {
                resolve(record)
            })
            setTimeout(() => {
                reject("Response timed out")
            }, RESPONSE_TIMEOUT)
        })

        
    }
}