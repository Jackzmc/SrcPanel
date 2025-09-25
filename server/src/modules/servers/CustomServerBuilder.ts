import { exec } from "child_process"
import { cp, mkdir, readdir, readFile, rmdir, unlink, writeFile } from "fs/promises"
import { nanoid } from "nanoid"
import path from 'path'
import { SMPluginMeta } from '../../../../common-types/CustomServer';
import User from "../../modules/users/User.js";
import { CustomServerGroup } from "./groups/CustomServerGroup.js";
import DockerServer from "./DockerServer.js";
import fastify from "fastify";
import SteamAPI from "../../modules/steam.js";
import { WorkshopItem } from "../../../../common-types/Share.js";
import logger from '../../logger.js'
const log = logger.child({ name: "CustomServerBuilder" })

export interface CustomServerOptions {
    extraPlayers?: boolean,
    pluginsIds?: string[],
    workshopIds?: string[],

    signal?: AbortSignal
}
export type CreateServerEventState = "INIT" | "INIT_FOLDERS" | "INSTALL_METAMOD" | "INSTALL_SOURCEMOD" | "SETUP_SOURCEMOD" | "INSTALL_PLUGINS" | "INSTALL_ADDONS" | "SETUP_CONFIGS" | "PROVISION_SERVER" | "ERROR"
const STATES = [
    "INIT", 
    "INIT_FOLDERS",
    "INSTALL_METAMOD", "INSTALL_SOURCEMOD", 
    "SETUP_SOURCEMOD", "INSTALL_PLUGINS",
    "INSTALL_ADDONS", "SETUP_CONFIGS",
    "PROVISION_SERVER", 
    "ERROR"
]

const CUSTOMER_FOLDER_LOCATION = process.env.CUSTOM_SERVER_CUSTOMER_DIR!
const TEMPLATE_FOLDER_LOCATION = process.env.CUSTOM_SERVER_TEMPLATE_DIR!
const PLUGIN_REPO_FOLDER_LOCATION = process.env.CUSTOM_SERVER_REPO_DIR!

const METAMOD_FILE = process.env.CUSTOM_SERVER_METAMOD_PATH!
const SOURCEMOD_FILE = process.env.CUSTOM_SERVER_SOURCEMOD_PATH!

const STEAM_DOWNLOAD_TIMEOUT = 1000 * 60 * 3

export type CreateCallback = (state: CreateServerEventState, msg?: string, meta?: Record<string, any>) => Promise<void> | void

export default class CustomServerBuilder {
    #steam: SteamAPI
    #group: CustomServerGroup

    #eventCallback: CreateCallback

    #id: string
    #name: string
    #options: CustomServerOptions
    #variables: Record<string, string|number|boolean> = {}

    #root: string

    #server: DockerServer
    #progress = { current: 0, total: 0 }
    #user: User | null = null
    constructor(steam: SteamAPI, group: CustomServerGroup) {
        if(!CUSTOMER_FOLDER_LOCATION) throw new Error("Missing env: CUSTOM_SERVER_CUSTOMER_DIR")
        if(!TEMPLATE_FOLDER_LOCATION) throw new Error("Missing env: CUSTOM_SERVER_TEMPLATE_DIR")
        if(!PLUGIN_REPO_FOLDER_LOCATION) throw new Error("Missing env: CUSTOM_SERVER_REPO_DIR")
        if(!METAMOD_FILE) throw new Error("Missing env: CUSTOM_SERVER_METAMOD_PATH")
        if(!SOURCEMOD_FILE) throw new Error("Missing env: CUSTOM_SERVER_SOURCEMOD_PATH")
        this.#steam = steam
        this.#group = group
    }

    #notify(state: CreateServerEventState, msg?: string) {
        if(!this.#eventCallback) return
        log.debug({ state, msg })
        this.#eventCallback(state, msg, this.#progress)
    }

    get User(): User | null { return this.#user }
    set User(user: User) { this.#user = user}

    async #cleanup() {
        log.debug({}, "cleaning up builder for", this.#id)
        try {
            await rmdir(this.#root)
            if(this.#server) {
                await this.#group.removeServer(this.#server)
            }
        } catch(err) {
            if(err.code == "ENOENT") throw err
        }
    }

    SetEventCallback(eventCb: CreateCallback) {
        this.#eventCallback = eventCb
    }

    async Create(name: string, options: CustomServerOptions = {}, variables: Record<string, string|number|boolean> = {}) {
        if(!CUSTOMER_FOLDER_LOCATION) throw new Error("Missing: " + "CUSTOMER_FOLDER_LOCATION")
        this.#name = name
        this.#options = options
        this.#variables = variables

        this.#id = nanoid(21)
        this.#variables = {
            id: this.#id,
            name: this.#name
        }
        this.#root = path.join(CUSTOMER_FOLDER_LOCATION, this.#id)
        log.debug({}, 'root', this.#root)
        this.#notify("INIT", `ID: ${this.#id}`)
        const order = [
            this.#installSourcemod,
            this.#setupSourcemod,
            this.#applyTemplates,

            this.#installPlugins,
            this.#installAddons,
        ]
        this.#options.signal?.throwIfAborted()
        this.#progress.total = order.length + 2
        
        try {
            await this.#initFolders()
            this.#progress.current++
            this.#server = await this.#registerServer()
            this.#progress.current++
            for(const func of order) {
                this.#options.signal?.throwIfAborted()
                await func.bind(this)()
                this.#progress.current++
            } 
            this.#progress.current = this.#progress.total
            return this.#server
        } catch(err) {
            log.error(`Error: `, err)
            await this.#cleanup()
            throw err
        }
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
        if(pluginFile.includes("..")) throw new Error("Parent dir entry '..' is not allowed");
        if(pluginFile.startsWith("/")) throw new Error("Plugin path must be relative")
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
        log.debug(`resolving ${this.#options.pluginsIds.length} plugins`)
        for(const pluginFilename of this.#options.pluginsIds) {
            this.#resolvePlugin(plugins, pluginRepo, pluginFilename)
        }
        log.debug(`installing ${Object.keys(plugins).length} plugins`)
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
        log.debug('done installing plugins')
    }

    async #installAddons() {
        this.#notify("INSTALL_ADDONS", "Resolving workshop files")
        if(!this.#options.workshopIds) return
        const details: WorkshopItem[] = []
        for(const wsId of this.#options.workshopIds) {
            this.#steam.addToWSResolveQueue(Number(wsId), (item) => {
                if(item) details.push(item)
            })
        }
        await this.#steam.resolveWSQueue()
        this.#notify("INSTALL_ADDONS", "Downloading addons from workshop")
        for(const detail of details) {
            const destPath = path.join(this.#root, "addons")
            await SteamAPI.downloadItem(detail, destPath, { timeout: STEAM_DOWNLOAD_TIMEOUT })
        }
    }


    async #applyTemplates() {
        this.#notify("SETUP_CONFIGS", "Setting up server configurations")
        const prefixLen = TEMPLATE_FOLDER_LOCATION.length + 1 // +1 to add trailign slash
        for(const dirent of await readdir(TEMPLATE_FOLDER_LOCATION, { recursive: true, withFileTypes: true })) {
            if(!dirent.isFile()) continue
            const relParent = dirent.parentPath.substring(prefixLen)
            // Create parent folders for id's folder
            try {
                await mkdir(path.join(this.#root, relParent), { recursive: true })
            } catch(err) {
                if(err.code !== "EEXISTS") throw err
            }
            log.debug(`file=${dirent.name} relParent=${relParent} full=${path.join(this.#root, relParent, dirent.name)}`)
            const content = this.#applyTemplate(await readFile(path.join(dirent.parentPath, dirent.name), 'utf-8'))
            await writeFile(path.join(this.#root, relParent, dirent.name), content)
            log.debug("done " + dirent.name)
        }
        log.debug("templates applied")
        // TEMPLATE_FOLDER_LOCATION
    }

    #applyTemplate(content: string): string {
        for(const [key, replacement] of Object.entries(this.#variables)) {
            content = content.replace(`%${key}%/g`, replacement.toString())
        }
        return content
    }

    async #registerServer() {
        this.#notify("PROVISION_SERVER", "Provisioning server")
        const server = await this.#group.createNewServer(this.#name, this.#user, [
            `${path.join(this.#root, 'cfg')}:/server/cfg`,
            `${path.join(this.#root, 'addons')}:/server/addons`,
        ])
        this.#variables = {
            ...this.#variables,
            adminpanel_auth_token: await server.Plugin.generateToken("CUSTOM_BUILDER"),
            server_ip: server.ip,
            server_port: server.port
        }
        // await server.start()
        return server
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