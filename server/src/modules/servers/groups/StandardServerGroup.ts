import Server, { ConfigServerData } from "../Server"
import StandardServer from "../StandardServer.js"
import ServerGroup, { CreateGroupOptions } from "./ServerGroup.js"
import DNS from 'dns/promises'


const REQUIRED_SERVER_PROPERTIES = ["host"]

export class StandardServerGroup extends ServerGroup<StandardServer> {
    constructor(id: string, options: CreateGroupOptions) {
        super(id, options)
    }
    
    async ParseServers(serverData: Record<string, ConfigServerData>) {
        const promises = Object.entries<ConfigServerData>(serverData)
            .filter(([id, server]) => {
                for(const prop of REQUIRED_SERVER_PROPERTIES) {
                    if(!server[prop]) {
                        console.warn(`[ServerManager] WARN: Skipping ${id}: Server is missing property \"${prop}\"`)
                        return false
                    }
                }
                return true
            })
            .map(async ([id, server]) => {
                const tags = server.tags ?? []
                let address: string|undefined = undefined
                try {
                    const lookup = await DNS.lookup(server.host, { verbatim: false, family: 4 })
                    address = lookup.address
                } catch(err) {
                    console.warn(`[ServerManager] Error: Could not resolve IP for hostname ${server.host} (skipping):\n`, err)
                    return null
                }

                const instance = new StandardServer(this, {
                    actions: server.actions ?? [],
                    id,
                    name: server.name,
                    ip: address,
                    port: Number(server.port) ?? 27015,
                    host: server.host,
                    type: server.type,
                    tags: tags,
                    cfgDirectory: server.cfgDirectory,
                    logsPath: server.logsPath,
                    activityId: server.activityId,
                    rcon: server.rcon,
                    systemd: server.systemd,
                    sortOrder: server.sortOrder
                })
                await instance.init()
                this._servers[id] = instance
            }).filter(s => s)
        return await Promise.allSettled(promises)
    }
}
