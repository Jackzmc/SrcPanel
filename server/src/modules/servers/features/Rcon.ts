import { Rcon, RconOptions } from "rcon-client";
import Feature from "./Feature.js";
import Server from "../Server.js";
import { ActionResponse, IAction } from "../IAction.js";
import { CommandResultType } from "../../../../../common-types/Live.js";

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
        let pass = this.#options.password
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
        const result = await this.#client.send(command)
        return {
          result: 1,
          type: CommandResultType.None,
          message: result
        }
    }

    /**
     * Converts built in command to actual command for given server. 
     * This allows different game support if the command is different. (minecraft uses "stop" instead of "exit")
     * @param command the built in command, without namespace
     * @returns null for unknown built in
     */
    #getFallbackCommandForBuiltin(command: string): string | null {
      switch(command) {
        case "stop": {
          return "exit"
        }
        case "request_stop": {
          return "sm_panel_request_stop"
        }
        case "kick": {
          return "sm_kick"
        }
        case "ban": {
          return "sm_ban"
        }
        case "unreserve": {
          return "sm_unreserve"
        }
        default: return null
      }
    }
}