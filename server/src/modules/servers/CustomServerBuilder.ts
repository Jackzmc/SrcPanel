import { exec } from "child_process"
import { cp, mkdir, readFile, writeFile } from "fs/promises"
import { nanoid } from "nanoid"
import path from 'path'
import { SMPluginMeta } from '../../../../common-types/CustomServer';

export interface CustomServerOptions {
    extraPlayers?: boolean,
    pluginsIds?: string[],
    workshopLinks?: string[]
}
export type CreateServerEventState = "INIT_FOLDERS" | "INSTALL_METAMOD" | "INSTALL_SOURCEMOD" | "SETUP_SOURCEMOD" | "INSTALL_PLUGINS" | "INSTALL_ADDONS" | "SETUP_CONFIGS"


const CUSTOMER_FOLDER_LOCATION = process.env.CUSTOM_SERVER_CUSTOMER_DIR!
const TEMPLATE_FOLDER_LOCATION = process.env.CUSTOM_SERVER_TEMPLATE_DIR!
const PLUGIN_REPO_FOLDER_LOCATION = process.env.CUSTOM_SERVER_REPO_DIR!

const METAMOD_FILE = process.env.CUSTOM_SERVER_METAMOD_PATH!
const SOURCEMOD_FILE = process.env.CUSTOM_SERVER_SOURCEMOD_PATH!

export type CreateCallback = (state: CreateServerEventState, msg?: string) => Promise<void> | void

export default class CustomServerBuilder {
    #name: string
    #options: CustomServerOptions

    #root: string
    #eventCallback: CreateCallback
    constructor(name: string, options: CustomServerOptions = {}) {
        if(!CUSTOMER_FOLDER_LOCATION) throw new Error("Missing env: CUSTOM_SERVER_CUSTOMER_DIR")
        if(!TEMPLATE_FOLDER_LOCATION) throw new Error("Missing env: CUSTOM_SERVER_TEMPLATE_DIR")
        if(!PLUGIN_REPO_FOLDER_LOCATION) throw new Error("Missing env: CUSTOM_SERVER_REPO_DIR")
        if(!METAMOD_FILE) throw new Error("Missing env: CUSTOM_SERVER_METAMOD_PATH")
        if(!SOURCEMOD_FILE) throw new Error("Missing env: CUSTOM_SERVER_SOURCEMOD_PATH")
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

        await this.#installSourcemod()
        await this.#setupSourcemod()
        await this.#applyTemplates()

        await this.#installPlugins()
        await this.#installAddons()
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
        this.#notify("INSTALL_METAMOD", "Installing metamod")
        await execPromise(`tar xf ${METAMOD_FILE} -C "${this.#root}"`)
        this.#notify("INSTALL_SOURCEMOD", "Installing sourcemod")
        await execPromise(`tar xf ${SOURCEMOD_FILE} -C "${this.#root}"`)
    }
    
    async #setupSourcemod() {
        this.#notify("SETUP_SOURCEMOD")
        // TODO: databases
    }

    async #resolvePlugin(list: Record<string, SMPluginMeta | true>, repo: Record<string, SMPluginMeta>, pluginFile: string) {
        if(pluginFile.endsWith(".so")) {
            list[pluginFile] = true
            return
        }
        const meta = repo[pluginFile]
        if(!meta) return console.error("[CustomServerBuilder] Missing plugin: " + pluginFile)
        if(meta.requires) {
            // Include any missing required plugins
            for(const require of meta.requires) {
                // If not already included
                if(!repo[require]) {
                    this.#resolvePlugin(list, repo, require)
                }
            }
        }
        list[pluginFile] = meta
    }

    async #installPlugins() {
        this.#notify("INSTALL_PLUGINS", "Resolving plugins and dependencies")
        if(!this.#options.pluginsIds) return
        const pluginRepo: Record<string, SMPluginMeta> = JSON.parse(await readFile(path.join(PLUGIN_REPO_FOLDER_LOCATION!, "plugins.json"), 'utf-8'))
        const plugins: Record<string, SMPluginMeta|true> = {}
        console.debug('resolving', this.#options.pluginsIds.length, 'plugins')
        for(const pluginFilename of this.#options.pluginsIds) {
            this.#resolvePlugin(plugins, pluginRepo, pluginFilename)
        }
        console.debug('installing', Object.keys(plugins).length, 'plugins')
        this.#notify("INSTALL_PLUGINS", "Installing plugins")
        for(const [filepath, meta] of Object.entries(plugins)) {
            if(filepath.endsWith(".so")) {
                console.time(filepath)
                await cp(
                    path.join(PLUGIN_REPO_FOLDER_LOCATION, "extensions", filepath), 
                    path.join(this.#root, "addons", "sourcemod", "extensions", filepath)
                ).catch((e) => console.error("ignore temp error", e))
                console.timeEnd(filepath)
            } else if(filepath.endsWith(".sp")) {
                const pluginName = filepath.replace(".sp", ".smx")
                console.time(pluginName)
                await cp(
                    path.join(PLUGIN_REPO_FOLDER_LOCATION, "plugins", pluginName), 
                    path.join(this.#root, "addons", "sourcemod", "plugins", pluginName)
                )
                console.timeEnd(pluginName)
            } else {
                throw new Error("Unknown file type: " + filepath)
            }
        }
        console.debug('done installing plugins')
    }

    async #installAddons() {
        this.#notify("INSTALL_ADDONS", "Downloading addons from workshop")
        if(!this.#options.workshopLinks) return
    }

    async #applyTemplates() {
        this.#notify("SETUP_CONFIGS", "Setting up server configurations")
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