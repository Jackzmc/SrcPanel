import Server, { ConfigServerData } from "../Server"
import StandardServer from "../StandardServer.js"
import ServerGroup, { CreateGroupOptions } from "./ServerGroup.js"
import DNS from 'dns/promises'
import { ListGroupConfig, ListGroupConfig_Server } from './index';
import { ServerAction } from "../../../../../common-types/Server.js";


const REQUIRED_SERVER_PROPERTIES = ["host"]

export class StandardServerGroup extends ServerGroup<StandardServer> {
    constructor(group: ListGroupConfig, actions: ServerAction[] = []) {
        super(group.id, group, actions)
    }


    async Create(id: string, server: ListGroupConfig_Server) {
        const instance = new StandardServer(this, server)
        await instance.Init()
        this.servers[id] = instance
    }
}
