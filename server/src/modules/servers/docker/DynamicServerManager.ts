import Docker, { Container } from 'dockerode'
import { readFile } from 'fs/promises'
import path from 'path'
import Json5 from 'json5';
import DynamicServerInstance from './DynamicServerInstance.js';
import ServerManager from '../ServerManager.js';
import { DynamicServerGroup } from '../groups/DynamicServerGroup.js';
export interface DockerTemplateConfig {
    id: string
    network?: "host" | string,
    image: string,
    ip: string,
    startPort: number,
    minInstances?: number
    volumes?: string[],
    command: string | string[]
}
export interface DockerTemplateContainer {
    config: DockerTemplateConfig,
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
        await this.findExisting()
    }

    async *#getContainers() {
        const containers = await this.#docker.listContainers({ all: true, filters: {
            "label": ["panel.template"]
        }})
        for(const containerInfo of containers) {
            if(containerInfo.Labels["panel.template"]) {
                const template = this.#templates[containerInfo.Labels["panel.template"]]
                if(!template) {
                    console.warn(`[ServerManager/docker] Warn: Found existing container (${containerInfo.Id.slice(0, 12)}${containerInfo.Names.join('')}) but does not match any template. skipping`)
                    continue
                }
                const container = this.#docker.getContainer(containerInfo.Id)
                yield {containerInfo, container, template}
            }
        }
    }

    async findExisting() {
        for await(const { containerInfo, container, template } of this.#getContainers()) {
            const port = containerInfo.Labels["panel.port"]
            const containerName = `panel-${template.config.id}-${port}`
            if(this.#instances[containerName]) {
                console.debug('debug: skipping existing registered container', containerName)
                return;
            }
            console.info(`[ServerManager/docker] Found existing container (${containerInfo.Id.slice(0, 12)}${containerInfo.Names.join('')})`)
            const instance = new DynamicServerInstance(template.config, container, template.config.ip, Number(port))
            await this.#registerInstance(instance)
        }
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
                try {
                    await this.#docker.pull(config.image)
                    this.#templates[id] = {
                        config,
                    }
                } catch(err) {
                    console.error(`[ServerManager/docker] Failed to pull image \"${config.image}\":`, err)
                }
            }
            console.debug('templates:', Object.keys(this.#templates).join(" "))
            console.info(`[ServerManager/docker] Loaded ${Object.keys(this.#templates).length} templates`)
        } catch(err) {
            if(err.code == "ENOENT")
                return null
            console.error("[ServerManager] Error: Failed to load templates.json: ", err)
        }
    }

    async #getNextPort(ofTemplate: DockerTemplateConfig) {
        const ports = []
        for await(const { containerInfo, container, template } of this.#getContainers()) {
            if(template.config.id != ofTemplate.id) continue
            const port = Number(containerInfo.Labels["panel.port"])
            ports.push(port)
        }
        ports.sort()
        console.log(ofTemplate.id, 'ports', ports)

        // Find next available, filling in gaps
        let port = ofTemplate.startPort;
        if(ports.includes(port)) {
            while(ports.includes(port)) {
                port++
            }
        }
        console.log('next port: ', port)
        return port
    }

    async #calculateCount(templateId: string) {
        let i = 0 ;
        for await(const { containerInfo, container, template } of this.#getContainers()) {
            if(template.config.id != templateId) continue
            i++
        }
        return i;
    }

    async createInstance(templateId: string) {
        const template = this.#templates[templateId]
        if(!template) throw new Error(`Unknown template id: \"${templateId}\"`)
        const port = await this.#getNextPort(template.config)

        const templVars = {
            ip: template.config.ip,
            port,
            id: template.config.id,
            index: await this.#calculateCount(templateId)
        }
        let commands = Array.isArray(template.config.command) ? template.config.command : [template.config.command]
        commands = commands.map(cmd => DynamicServerGroup.formatTemplateVar(cmd, templVars))

        const config = {
            name: `panel-${templateId}-${port}`,
            Image: template.config.image,
            AttachStdin: true,
            Tty: true,
            OpenStdin: true,
            // TODO: improve 
            Cmd: commands,
            // ExposedPorts: {
            //     '27015/udp': {}
            // },
            HostConfig: {
                "NetworkMode": template.config.network,
                "Binds": template.config.volumes ?? [],
                "RestartPolicy": {
                    "Name": "unless-stopped",
                    MaximumRetryCount: 3
                },
                "PortBindings": { "27015/udp": [{ "HostPort": port.toString(), "HostIp": template.config.ip }] }
            },
            Labels: {
                "panel.template": templateId,
                "panel.port": port.toString(),
            },
        }
        const container = await this.#docker.createContainer(config)
        const instance =  new DynamicServerInstance(template.config, container, template.config.ip, port)
        await this.#registerInstance(instance)
        return instance
    }

    getTemplate(templateId: string) {
        return this.#templates[templateId]
    }

    async updateTemplate(template: DockerTemplateContainer) {
        await this.#docker.pull(template.config.image)
        // TODO: restart containers?
        
    }
    async #registerInstance(instance: DynamicServerInstance) {
        this.#instances[instance.ContainerName] = instance
    }

    async unregisterInstance(instance: DynamicServerInstance) {
        delete this.#instances[instance.ContainerName]
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