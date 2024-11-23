import { exec } from "child_process"
import { mkdir, writeFile } from "fs/promises"
import { nanoid } from "nanoid"
import path from 'path'

export interface CustomServerOptions {
    extraPlayers?: boolean
}
export type CreateServerEventState = "INIT_FOLDERS" | "INSTALL_METAMOD" | "INSTALL_SOURCEMOD" | "SETUP_SOURCEMOD" | "INSTALL_PLUGINS" | "INSTALL_ADDONS"


const CUSTOMER_FOLDER_LOCATION = process.env.CUSTOM_SERVER_CUSTOMER_DIR
const TEMPLATE_FOLDER_LOCATION = process.env.CUSTOM_SERVER_TEMPLATE_DIR

const METAMOD_FILE = process.env.CUSTOM_SERVER_METAMOD_PATH
const SOURCEMOD_FILE = process.env.CUSTOM_SERVER_SOURCEMOD_PATH

export type CreateCallback = (state: CreateServerEventState, msg?: string) => Promise<void>

export default class CustomServerBuilder {
    #name: string
    #options: CustomServerOptions

    #root: string
    #eventCallback: CreateCallback
    constructor(name: string, options: CustomServerOptions = {}) {
        this.#name = name
        this.#options = options
    }

    #notify(state: CreateServerEventState, msg?: string) {
        this.#eventCallback(state, msg)
    }

    async Create(eventCb: CreateCallback) {
        if(!CUSTOMER_FOLDER_LOCATION) throw new Error("Missing: " + "CUSTOMER_FOLDER_LOCATION")
        this.#eventCallback = eventCb

        const id = nanoid(21)
        this.#root = path.join(CUSTOMER_FOLDER_LOCATION, id)
        console.log('root', this.#root)
        
        await this.#initFolders()
        eventCb("INIT_FOLDERS")

        await this.#installSourcemod()
    }

    async #initFolders() {
        this.#notify("INIT_FOLDERS", "Creating folders")
        await mkdir(this.#root)
        await mkdir(path.join(this.#root, "addons"))
        await mkdir(path.join(this.#root, "cfg"))
        // Create empty addonlist.txt for enabled addons
        await writeFile(path.join(this.#root, "addons", "addonlist.txt"), "")
    }

    async #installSourcemod() {
        const addonsFolder = path.join(this.#root, "addons")
        this.#notify("INSTALL_METAMOD", "Installing metamod")
        await execPromise(`tar xf ${METAMOD_FILE} -C "${addonsFolder}"`)
        this.#notify("INSTALL_SOURCEMOD", "Installing sourcemod")
        await execPromise(`tar xf ${SOURCEMOD_FILE} -C "${addonsFolder}"`)
    }
    
    async #setupSourcemod() {
        this.#notify("SETUP_SOURCEMOD")
    }

    async #installPlugins() {
        this.#notify("INSTALL_PLUGINS", "Installing plugins")
    }

    async #installAddons() {
        this.#notify("INSTALL_ADDONS", "Downloading addons")
    }

    async #applyTemplates() {
        // TEMPLATE_FOLDER_LOCATION
    }
}

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execPromise(cmd: string): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
            if (error) {
                console.warn("execPromise", error);
                return reject({
                    stdout,
                    stderr
                });
            }
            resolve({
                stdout,
                stderr
            });
        });
    });
}