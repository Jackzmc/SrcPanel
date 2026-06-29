import { Rcon, RconOptions } from "rcon-client";
import Feature from "./Feature.js";
import Server from "../Server.js";
import { ActionResponse, getFallbackCommandForBuiltin, IAction } from "../IAction.js";
import { CommandResultType } from "@srcpanel/common/Live";

export default class RconFeature extends Feature implements IAction {
    #client: Rcon
    #available: boolean
    #connected: boolean

    #options: RconOptions
    constructor(server: Server, options: RconOptions) {
        super("Rcon", server)
    }

    get available() {
        return this.#available
    }

    get Connected() {
        return this.#available && this.#connected
    }

    async init() {
        const pass = this.#options.password
        if(!pass) {
            console.warn(`[Server/${this._server.id}] No rcon password provided or found`)
            this.#available = false
        }
        this.#client = new Rcon(this.#options)
        try {
            await this.#client.connect()
            console.log(`[Server/${this._server.id}] Initial RCON connection successful`)
            this.#available = true
        } catch(err) {
            console.warn(`[Server/${this._server.id}] Initial RCON connection failed:`, err.message)
            this.#available = false
        }
    }

    /**
     * Attempts to reconnect if not already reconnected. Will do nothing if authenticated already.
     * @returns 
     */
    async reconnect(): Promise<boolean> {
      if(!this.#client) return false
      if(!this.#client.authenticated) {
        try {
          await this.#client.connect()
          this.#connected = true
          return true
        } catch(err) {
          console.warn(`[Server/${this._server.id}] Rcon connection failed:`, err.message)
          this.#connected = false
          return false
        }
      }
      return this.#connected
    }

    async disconnect() {
        await this.#client.end()
        this.#connected = false
    }

    async performAction(command: string, namespace = "default"): Promise<ActionResponse> {
      let cmd: string|null
      if(namespace === "builtin") {
        cmd = getFallbackCommandForBuiltin(command)
        if(!cmd) throw new Error(`Unable to run builtin:${command} via rcon`)
      }
      else if(namespace !== "default") {
        throw new Error("Unsupported namespace")
      }
      const result = await this.#client.send(command)
      return {
        result: 1,
        type: CommandResultType.None,
        message: result
      }
    }
}