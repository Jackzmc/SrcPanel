import StandardServer from "../StandardServer.js"
import ServerGroup from "./ServerGroup.js"
import { ListGroupConfig, ListGroupConfig_Server } from './index';
import { ServerAction } from "../../../../../common-types/Server.js";


export class StandardServerGroup extends ServerGroup<StandardServer> {


    constructor(group: ListGroupConfig, actions: ServerAction[] = []) {
        super("list", group.id, group, actions)
    }


    async Create(id: string, server: ListGroupConfig_Server) {
        const instance = new StandardServer(this, server)
        await instance.Init()
        this.servers[id] = instance
    }
}
