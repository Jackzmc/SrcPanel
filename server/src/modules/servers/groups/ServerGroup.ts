import { ServerAction } from "../../../../../common-types/Server.js"
import Server from "../Server.js"

export interface CreateGroupOptions {
    name?: string
    game?: string,
    description?: string
}


export default class ServerGroup<T extends Server = Server> {
    protected id: string
    protected name: string
    protected game?: string
    protected description: string
    protected actions: ServerAction[]
    protected servers: Record<string, T> = {}
    protected type: string

    constructor(type: string, id: string, options: CreateGroupOptions, actions: ServerAction[] = []) {
        this.type = type
        this.id = id
        this.name = options.name ?? id
        this.game = options.game
        this.description = options.description ?? ""
        this.actions = actions
    }

    /** The type (not game) of server, such as 'docker', 'list', 'custom' */
    get Type() { return this.type }
    get Id() { return this.id }
    get Name() { return this.name }
    get Description() { return this.description }
    get Game() { return this.game }
    get Actions() { return [...this.actions] }

    get ServerCount() { return Object.keys(this.servers).length }

    get Servers() {
        return Object.values(this.servers)
    }

    async onShutdown() {
        for(const server of Object.values(this.servers)) {
            server?.Plugin?.pushRecord(null)
        }
    }

    getServer(id: string): Server | undefined {
        return this.servers[id]
    }

    getServerByPort(port: number) {
        for(const server of Object.values(this.servers)) {
            if(server.port === port)
                return server
        }
        return null
    }

    removeServer(server: T) {
        delete this.servers[server.id]
    }

    async performActionAll(command: string, namespace: string) {
        for(const server of Object.values(this.servers)) {
            await server.performAction(command, namespace)
        }
        return null
    }

}