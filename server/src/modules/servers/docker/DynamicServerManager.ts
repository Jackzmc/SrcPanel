import Docker from 'dockerode'
import { readFile } from 'fs/promises'
import path from 'path'
import Json5 from 'json5';
import DynamicServerInstance from './DynamicServerInstance.js';
import ServerManager from '../ServerManager.js';
import { DynamicServerGroup } from '../groups/DynamicServerGroup.js';
export interface DockerTemplateConfig {
    id: string
    image: string,
    ip: string,
    startPort: number,
    minInstances?: number
    volumes?: string[],
    command: string
}
export interface DockerTemplateContainer {
    config: DockerTemplateConfig,
    nextPort: number
}

export default class DynamicServerManager {
    #docker: Docker
    #templates: Record<string, DockerTemplateContainer> = {}
    #instances: Record<string, DynamicServerInstance> = {}
    #configDir: string
    #srvManager: ServerManager
    constructor(serverManager: ServerManager, configDir: string, dockerConfig: Docker.DockerOptions) {
        this.#srvManager = serverManager
        this.#docker = new Docker(dockerConfig)
        this.#docker.info().then(() => {
            console.info(`[ServerManager/docker] Docker connected`)
        })
        this.#configDir = configDir
    }

    async Load() {
        await this.#loadTemplates()
        await this.#findExisting()
    }

    async #findExisting() {
        const containers = await this.#docker.listContainers({ all: true })
        for(const containerInfo of containers) {
            if(containerInfo.Labels["panel.template"]) {
                const template = this.#templates[containerInfo.Labels["panel.template"]]
                if(!template) {
                    console.warn(`[ServerManager/docker] Warn: Found existing container (${containerInfo.Id.slice(12)}${containerInfo.Names.join('')}) but does not match any template. skipping`)
                    continue
                }
                const port = containerInfo.Labels["panel.port"]
                console.info(`[ServerManager/docker] Found existing container (${containerInfo.Id.slice(12)}${containerInfo.Names.join('')})`)
                const container = this.#docker.getContainer(containerInfo.Id)
                const instance = new DynamicServerInstance(template.config, container, template.config.ip, Number(port))
                await this.#registerInstance(instance)
            }
        }
        console.info(`[ServerManager/docker] Found ${Object.keys(this.#instances).length} existing containers`)
    }

    async #loadTemplates() {
        try {
            const templatesFile = await readFile(path.join(this.#configDir, "templates.json"), 'utf-8')
            const templates = Json5.parse(templatesFile)
            for(const [id, data] of Object.entries(templates)) {
                // TODO: verify
                const config = {
                    ...data as DockerTemplateConfig,
                    id
                } as DockerTemplateConfig
                this.#templates[id] = {
                    config,
                    nextPort: config.startPort
                }
            }
            console.log(Object.keys(this.#templates))
            console.info(`[ServerManager/docker] Loaded ${Object.keys(this.#templates).length} templates`)
        } catch(err) {
            if(err.code == "ENOENT")
                return null
            console.error("[ServerManager] Error: Failed to load templates.json: ", err)
        }
    }

    async createInstance(templateId: string) {
        const template = this.#templates[templateId]
        if(!template) throw new Error(`Unknown template id: \"${templateId}\"`)
        const port = template.nextPort
        template.nextPort++

        const command = DynamicServerGroup.formatTemplateVar(template.config.command,
            {
                ip: template.config.ip,
                port,
                id: template.config.id
            }
        )
        const config = {
            name: `panel-${templateId}-${port}`,
            Image: template.config.image,
            AttachStdin: true,
            Tty: true,
            OpenStdin: true,
            // TODO: improve 
            Cmd: [command],
            // ExposedPorts: {
            //     '27015/udp': {}
            // },
            HostConfig: {
                "NetworkMode": "host",
                "Binds": template.config.volumes ?? []
                // "PortBindings": { "27015/udp": [{ "HostPort": port.toString(), "HostIp": template.config.ip }] }
            },
            Labels: {
                "panel.template": templateId,
                "panel.port": port.toString(),
            }
        }
        const container = await this.#docker.createContainer(config)
        const instance =  new DynamicServerInstance(template.config, container, template.config.ip, port)
        await this.#registerInstance(instance)
        return instance
    }

    async #registerInstance(instance: DynamicServerInstance) {
        this.#instances[instance.ContainerName] = instance
    }

    getInstance(id: string) {
        return this.#instances[id] ?? null
    }

    getInstancesForTemplate(templateId: string) {
        return Object.values(this.#instances)
            .filter(inst => inst.TemplateId === templateId)
    }

    get Templates() {
        return JSON.parse(JSON.stringify(this.#templates))
    }
}