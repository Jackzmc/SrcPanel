import { ServerAction } from "../../../../../common-types/Server.js"
import DynamicServerInstance from "../docker/DynamicServerInstance.js"
import DynamicServerManager, { DockerTemplateContainer } from "../docker/DynamicServerManager.js"
import DockerServer from "../DockerServer.js"
import { DynamicGroupServerTemplate } from "./CustomServerGroup.js"
import { BaseGroupConfig, DockerGroupConfig } from "./index.js"
import ServerGroup from "./ServerGroup.js"
import DNS from 'dns/promises';

export default abstract class BaseDynamicServerGroup extends ServerGroup<DockerServer> {
    protected template: DockerTemplateContainer
    protected serverTemplate: DynamicGroupServerTemplate
    protected manager: DynamicServerManager


    constructor(dynamicManager: DynamicServerManager, group: DockerGroupConfig, actions: ServerAction[] = []) {
        super(group.id, group, actions)
        this.manager = dynamicManager
        this.template = dynamicManager.getTemplate(group.docker.template)
    }

    get TemplateId() {
        return this.template.config.id
    }

    get TemplateConfig() {
        return this.template.config
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
        const ip = BaseDynamicServerGroup.formatTemplateVar(this.serverTemplate.host, vars)
        const [, host, port] = ip.match(/([a-zA-Z0-9.]+):?(\d*)/) ?? []
        let address = instance.PublicIp
        try {
            const lookup = await DNS.lookup(host, { verbatim: false, family: 4 })
            address = lookup.address
        } catch(err) {
            console.warn(`[ServerManager] Warn: Could not resolve IP for hostname ${host}:\n`, err)
        }
        const server = new DockerServer(this, {
                id,
                name: BaseDynamicServerGroup.formatTemplateVar(this.serverTemplate.name ?? "", vars),
                hostname: {
                    public: instance.PublicIp,
                    internal: instance.InternalIp
                },
                port: instance.Port,
                game: this.Game!, // is required and checked in groups/index
                tags: this.serverTemplate.tags ?? [],
                actions: this.serverTemplate.actions ?? [],
                activityId: this.serverTemplate.activityId,
                sortOrder: this.serverTemplate.sortOrder
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