import { ServerAction } from "../../../../../common-types/Server.js"
import DynamicServerInstance from "../docker/DynamicServerInstance.js"
import DynamicServerManager, { DockerTemplateContainer } from "../docker/DynamicServerManager.js"
import DockerServer from "../DockerServer.js"
import { DynamicGroupServerTemplate } from "./CustomServerGroup.js"
import { BaseGroupConfig, DockerGroupConfig } from "./index.js"
import ServerGroup from "./ServerGroup.js"
import DNS from 'dns/promises';

export default abstract class BaseDynamicServerGroup extends ServerGroup<DockerServer> {
    protected manager: DynamicServerManager
    protected template: DockerTemplateContainer


    constructor(type: string, dynamicManager: DynamicServerManager, group: DockerGroupConfig, template: DockerTemplateContainer, actions: ServerAction[] = []) {
        super(type, group.id, group, actions)
        this.manager = dynamicManager
        this.template = template
    }

    get TemplateId() {
        return this.template.config.id
    }

    get TemplateConfig() {
        return this.template?.config
    }

    get ServerTemplate() {
        return this.template?.config.serverTemplate ?? {}
    }

    static formatTemplateVar(template: string, variables: Record<string, string | number>) {
        return Object.entries(variables)
            .reduce((acc, [key, value]) => {
                if(!value) return acc
                return acc.replace(new RegExp(`%${key}%`, 'g'), value.toString())
            }, template)
    }

    protected async registerInstance(instance: DynamicServerInstance, variables: Record<string, any> = {}) {
        const vars = {
            id: instance.TemplateId,
            index: Object.keys(this.servers).length + 1,
            ip: instance.PublicIp,
            port: instance.Port,
            ...variables,
        }
        const id = `${this.Id}-${instance.Port}`
        const publicHost = BaseDynamicServerGroup.formatTemplateVar(this.ServerTemplate.host ?? "%ip%", vars)
        const name = this.ServerTemplate.name && BaseDynamicServerGroup.formatTemplateVar(this.ServerTemplate.name ?? "", vars)
        /// This is where server template gets applied
        const server = new DockerServer(this, {
                id,
                name,
                public: {
                    host: publicHost,
                    port: instance.Port
                },
                internal: {
                    host: instance.InternalIp
                },
                game: this.Game!, // is required and checked in groups/index
                tags: this.ServerTemplate.tags ?? [],
                activityId: this.ServerTemplate.activityId,
                sortOrder: this.ServerTemplate.sortOrder
            }, instance)
        instance.setServer(server)
        await server.Init()
        this.servers[id] = server
        return server
    }

    async _createNewServer(labels: Record<string, any> = {}, variables: Record<string, any> = {}) {
        const instance = await this.manager.createInstance(this.TemplateId, [], {
            "panel.dynamic_server": "true",
            ...labels
        })
        const server = await this.registerInstance(instance, variables)
        return server
    }
}