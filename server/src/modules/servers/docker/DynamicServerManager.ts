import Docker from 'dockerode'
import { readFile } from 'fs/promises'
import path from 'path'
import DynamicServerInstance from './DynamicServerInstance.js';
import ServerManager from '../ServerManager.js';
import { DynamicServerGroup } from '../groups/DynamicServerGroup.js';
import { ServerEvent } from '../DockerServer.js';
import yaml from 'yaml';
import logger from '../../../logger.js'

const log = logger.child({ name: "DynamicServerManager"})


export interface DockerTemplateConfig {
    id: string
    network?: "host" | string,
    image: string,
    bindIp: string,
    ports: { start: number, end?: number },
    volumes?: string[],
    command: string,
    serverTemplate?: ServerTemplate
}
export interface ServerTemplate {
    name?: string,
    tags?: string[],
    host?: string

    game?: string,
    sortOrder?: number,
    cfgDirectory?: string,
    activityId?: string,
    logsPath?: string,
    rcon?: {
        ip?: string,
        port?: number,
        password?: string
    },
    actionsIds?: string[]
}
export interface DockerTemplateContainer {
    config: DockerTemplateConfig,
}

export const DOCKER_NAME_PREFIX = process.env.DOCKER_NAME_PREFIX ?? "panel"


export default class DynamicServerManager {
    static #instance: DynamicServerManager;
    #docker: Docker
    #templates: Record<string, DockerTemplateContainer> = {}
    #instances: Record<string, DynamicServerInstance> = {}
    #configDir: string
    #srvManager: ServerManager
    constructor(serverManager: ServerManager, configDir: string, dockerConfig: Docker.DockerOptions) {
        this.#srvManager = serverManager
        this.#docker = new Docker(dockerConfig)
        this.#docker.info().then(() => {
            log.info(`Docker connected, using prefix ${DOCKER_NAME_PREFIX}`)
        })
        this.#configDir = configDir
        DynamicServerManager.#instance = this
    }

    static get Instance() {
        return this.#instance
    }

    async Load() {
        await this.#loadTemplates()
        await this.findExisting()

        const stream = await this.#docker.getEvents()
        stream.on('data', (chunk) => {
            const event = JSON.parse(chunk.toString());
            // event.status === 'restart' or start
            if(event.status === "start") {
                // const container = this.#instances[]
                // const container = this.findContainerById(event.id)
                const server = this.#srvManager.getServerByContainerId(event.id)
                server?._notifyEvent(ServerEvent.Started)
                // container._notifyState(?)
            } else if(event.status === "stop") {
                const server = this.#srvManager.getServerByContainerId(event.id)
                server?._notifyEvent(ServerEvent.Stopped)
            }
        });
    }

    findContainerById(id: string) {
        for(const container of Object.values(this.#instances)) {
            if(container.ContainerId === id) {
                return container
            }
        }
        return null
    }

    async *#getContainers() {
        const containers = await this.#docker.listContainers({ all: true, filters: {
            "label": [`${DOCKER_NAME_PREFIX}.template`]
        }})
        for(const containerInfo of containers) {
            if(containerInfo.Labels["panel.template"]) {
                const template = this.#templates[containerInfo.Labels["panel.template"]]
                if(!template) {
                    log.warn(`Found existing container (${containerInfo.Id.slice(0, 12)}${containerInfo.Names.join('')}) but does not match any template. skipping`)
                    continue
                }
                const container = this.#docker.getContainer(containerInfo.Id)
                yield {containerInfo, container, template}
            }
        }
    }

    /**
     * Finds existing docker containers and recreates their instance if missing
     * It uses DOCKERNAMEPREFIX.port label to get port
     * @returns 
     */
    async findExisting() {
        for await(const { containerInfo, container, template } of this.#getContainers()) {
            const port = containerInfo.Labels[`${DOCKER_NAME_PREFIX}.port`]
            const containerName = `${DOCKER_NAME_PREFIX}-${template.config.id}-${port}`
            if(this.#instances[containerName]) {
                return;
            }
            log.info(`Found existing container (${containerInfo.Id.slice(0, 12)}${containerInfo.Names.join('')})`)
            const instance = new DynamicServerInstance(template.config, container, template.config.bindIp, Number(port))
            await this.#registerInstance(instance)
        }
    }

    async #loadTemplates() {
        try {
            const templatesFile = await readFile(path.join(this.#configDir, "templates.yml"), 'utf-8')
            const templates = yaml.parse(templatesFile)
            for(const [id, data] of Object.entries(templates)) {
                // if(!data.serverTemplate) throw new Error(`Template ${id} missing 'server_template' field`)
                // TODO: verify
                const config = {
                    ...data as DockerTemplateConfig,
                    id
                } as DockerTemplateConfig
                try {
                    // await this.#docker.pull(config.image)
                    this.#templates[id] = {
                        config,
                    }
                    log.trace({ config }, `Loaded template ${id}`)
                } catch(err) {
                    log.error(`Failed to pull image "${config.image}":`, err)
                }
            }
            log.info(`Loaded ${Object.keys(this.#templates).length} templates`)
        } catch(err) {
            log.error("Failed to load templates.yaml: ", err)
        }
    }

    /**
     * Finds the next available port based on template settings
     * This only detects port is occupied by another internally managed instance
     * If a port is used externally (by another process), it will still try to use that port
     * @throws fails if confnigured port range exhausted
     * @param ofTemplate
     * @returns 
     */
    async #getNextPort(ofTemplate: DockerTemplateConfig) {
        const ports: number[] = []
        for await(const { containerInfo, template } of this.#getContainers()) {
            if(template.config.id != ofTemplate.id) continue
            const port = Number(containerInfo.Labels[`${DOCKER_NAME_PREFIX}.port`])
            ports.push(port)
        }
        ports.sort()

        // Find next available, filling in gaps
        let port = ofTemplate.ports.start;
        log.trace("finding available port from " + ofTemplate.ports.start)
        if(ports.includes(port)) {
            while(ports.includes(port)) {
                port++
            }
        }
        if(ofTemplate.ports.end != undefined && port >= ofTemplate.ports.end) {
            throw new Error("No more available ports")
        }
        return port
    }

    /**
     * Returns the number of containers that exist for this template
     * @param templateId 
     * @returns 
     */
    async #calculateCount(templateId: string) {
        let i = 0 ;
        for await(const { template } of this.#getContainers()) {
            if(template.config.id != templateId) continue
            i++
        }
        return i;
    }

    async createInstance(templateId: string, volumes: string[] = [], labels: Record<string, string> = {}) {
        const template = this.#templates[templateId]
        if(!template) throw new Error(`Unknown template id: "${templateId}"`)
        const port = await this.#getNextPort(template.config)

        const templVars = {
            ip: template.config.bindIp,
            port,
            id: template.config.id,
            index: await this.#calculateCount(templateId)
        }
        let commands = Array.isArray(template.config.command) ? template.config.command : [template.config.command]
        commands = commands.map(cmd => DynamicServerGroup.formatTemplateVar(cmd, templVars))
        const config = {
            name: `${DOCKER_NAME_PREFIX}-${templateId}-${port}`,
            Image: template.config.image,
            AttachStdin: true,
            Tty: true,
            OpenStdin: true,
            // TODO: improve 
            Cmd: commands,
            ExposedPorts: {
                [`${port.toString()}/udp`]: {}
            },
            HostConfig: {
                "NetworkMode": template.config.network,
                "Binds": template.config.volumes?.concat(volumes) ?? [],
                "RestartPolicy": {
                    "Name": "unless-stopped",
                    // MaximumRetryCount: 3
                },
                "PortBindings": { [`${port.toString()}/udp`]: [{ 
                    
                    "HostPort": port.toString(), 
                    
                    "HostIp": template.config.bindIp
                
                }] },
               "LogConfig": {
                    Type: "local",
                    Config: {}
                },
            },
            Labels: {
                [`${DOCKER_NAME_PREFIX}.template`]: templateId,
                [`${DOCKER_NAME_PREFIX}.port`]: port.toString(),
                ...labels
            },
        }
        log.debug({ config }, "config")
        const container = await this.#docker.createContainer(config)
        const instance =  new DynamicServerInstance(template.config, container, template.config.bindIp, port)
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
        await instance.Init()
        this.#instances[instance.ContainerName] = instance
    }

    async deleteInstance(instance: DynamicServerInstance) {
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