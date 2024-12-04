import { Container, ContainerInspectInfo } from "dockerode"
import { DockerTemplateConfig } from "./DynamicServerManager.js"
import DockerServer from "../DockerServer.js"

export default class DynamicServerInstance {
    #template: DockerTemplateConfig
    #publicIp: string
    #internalIp: string
    #port: number
    #container: Container
    #server: DockerServer | null = null

    #startTime: number|null = null

    #init = false

    constructor(template: DockerTemplateConfig, container: Container, publicIp: string, port: number) {
        this.#template = template
        this.#container = container
        this.#publicIp = publicIp
        this.#port = port
    }

    async Init(): Promise<void> {
        if(this.#init) throw new Error("Already initalized")
        this.#init = true

        const state = await this.state()
        const startDateTime = new Date(state.StartedAt).valueOf()
        this.#startTime = startDateTime ? Math.round(startDateTime / 1000) : null
        console.log(startDateTime, this.#startTime)

        const inspect = await this.#container.inspect()
        const network = inspect.NetworkSettings.Networks[this.#template.network!]
        // If there is no assigned IP, such as net=host, then fall back to public ip
        this.#internalIp = network ? network.IPAddress : this.#template.ip
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

    get PublicIp() { 
        return this.#publicIp
    }

    get InternalIp() {
        return this.#internalIp
    }
    get Port() {
        return this.#port
    }
    get Hostname() {
        return `${this.PublicIp}:${this.Port}`
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
        await this.#container.start()
        this.#startTime = Math.round(Date.now()/1000)
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