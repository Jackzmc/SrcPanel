import { Container, ContainerInspectInfo } from "dockerode"
import { DockerTemplateConfig } from "./DynamicServerManager.js"
import DockerServer from "../DockerServer.js"

export default class DynamicServerInstance {
    #template: DockerTemplateConfig
    #ip: string
    #port: number
    #container: Container
    #server: DockerServer | null = null

    #startTime: number = null

    constructor(template: DockerTemplateConfig, container: Container, ip: string, port: number) {
        this.#template = template
        this.#container = container
        this.#ip = ip
        this.#port = port
        
        this.state().then(state => {
            this.#startTime = new Date(state.StartedAt).valueOf() / 1000
        })
    }

    get StartTime(): number | null {
        return this.#startTime
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

    get Server(): DockerServer | null {
        return this.#server ?? null
    }

    async exists() {
        try {
            await this.#container.inspect()
            return true
        } catch(err) {
            return false
        }
    }

    async state(): Promise<ContainerInspectInfo['State']> {
        const inspect = await this.#container.inspect()
        return inspect.State
    }

    async start() {
        return await this.#container.start()
    }
    async tryStart() {
        try { 
            await this.#container.start()
            return true
        } catch(err) {
            return false
        }
    }

    async stop(force = false) {
        return await (force ? this.#container.kill() : this.#container.stop())
    }

    async fetchLogs() {
        return (await this.#container.logs({ stdout: true, stderr: true })).toString()
    }

    setServer(server: DockerServer | null) {
        this.#server = server
    }
}