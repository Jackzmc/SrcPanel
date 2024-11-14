import { Container, ContainerInspectInfo } from "dockerode"
import { DockerTemplateConfig } from "./DynamicServerManager.js"

export default class DynamicServerInstance {
    #template: DockerTemplateConfig
    #ip: string
    #port: number
    #container: Container

    constructor(template: DockerTemplateConfig, container: Container, ip: string, port: number) {
        this.#template = template
        this.#container = container
        this.#ip = ip
        this.#port = port
    }

    get Container() {
        return this.#container
    }
    
    get TemplateId() {
        return this.#template.id
    }

    get Ip() { 
        return this.#ip
    }
    get Port() {
        return this.#port
    }
    get Hostname() {
        return `${this.Ip}:${this.Port}`
    }
    get ContainerId() {
        return this.#container.id
    }

    get ContainerName() {
        return `panel-${this.#template.id}-${this.#port}`
    }

    async Exists() {
        try {
            await this.#container.inspect()
            return true
        } catch(err) {
            return false
        }
    }

    async State(): Promise<ContainerInspectInfo['State']> {
        const inspect = await this.#container.inspect()
        return inspect.State
    }

    async Start() {
        return await this.#container.start()
    }
    async Stop(force = false) {
        return await (force ? this.#container.kill() : this.#container.stop())
    }

    async FetchLogs() {
        return (await this.#container.logs({ stdout: true, stderr: true })).toString()
    }
}