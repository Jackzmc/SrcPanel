import Server, { ConfigServerData } from "../Server"
import StandardServer from "../StandardServer.js"
import ServerGroup, { CreateGroupOptions } from "./ServerGroup.js"
import DNS from 'dns/promises'


const REQUIRED_SERVER_PROPERTIES = ["ip"]

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
                const [, host, port] = server.ip.match(/([a-zA-Z0-9.]+):?(\d*)/) ?? []
                const tags = server.tags ?? []
                let address = server.ip
                try {
                    const lookup = await DNS.lookup(host, { verbatim: false, family: 4 })
                    address = lookup.address
                } catch(err) {
                    console.warn(`[ServerManager] Warn: Could not resolve IP for hostname ${host}:\n`, err)
                }

                const instance = new StandardServer(this, {
                    actions: server.actions ?? [],
                    id,
                    name: server.name,
                    domain: host,
                    port: Number(port) ?? 27015,
                    ip: address,
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
            })
        return await Promise.allSettled(promises)
    }
}
