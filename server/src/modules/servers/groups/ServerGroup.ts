import { ServerAction } from "../../../../../common-types/Server.js"
import Server from "../Server.js"

export interface CreateGroupOptions {
    name?: string
    type: string,
    description?: string
    actions?: ServerAction[]
}


export default class ServerGroup {
    _id: string
    _name: string
    _type: string
    _description: string
    _actions: ServerAction[]

    _servers: Record<string, Server> = {}
    constructor(id: string, options: CreateGroupOptions) {
        this._id = id
        this._name = options.name ?? id
        this._type = options.type
        this._actions = options.actions ?? []
        this._description = options.description ?? ""
    }

    get Id() { return this._id }
    get Name() { return this._name }
    get Description() { return this._description }
    get Type() { return this._type }
    get Actions() { return [...this._actions] }

    get ServerCount() { return Object.keys(this._servers).length }

    get Servers() {
        return Object.values(this._servers)
    }

    async onShutdown() {
        for(const server of Object.values(this._servers)) {
            server.pushLiveRecord(null)
        }
    }

    getServer(id: string) {
        return this._servers[id]
    }

}