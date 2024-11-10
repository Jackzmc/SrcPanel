import { join, resolve } from "path";
import Server from "../Server.js";
import Feature from "./Feature.js";
import { readdir, stat } from "fs/promises";
import ServerManager from "../ServerManager.js";

const VALID_CONFIG_EXTS = ["cfg", "toml", "yml", "json"]

export default class ConfigsFeature extends Feature {
    #cfgDir: string
    #available: boolean
    constructor(server: Server, configDir: string) {
        super("Configs", server)
    }

    async init() {
        try {
            await stat(this.#cfgDir)
            this.#available = true
        } catch(err) {
            this.#available = false
            console.error(`[Server/${this._server.id}] ERROR: Could not access config directory:`, err)
        }
    }

    get configDir() {
      return this.#cfgDir
    }

    get available() {
        return this.#available
    }

    /**
     * Returns a list of config files' paths recursively
     * @param showHidden Should hidden files be included (see HIDDEN_CONFIG_FILES)
     * @returns string[]
     */
    public async getConfigFiles(showHidden = false) {
      if(!this.#cfgDir) return
      return await this.#recurseConfig(this.#cfgDir, showHidden)
    }

    async #recurseConfig(path: string, showHidden: boolean, parent = "") {
      const dirents = await readdir(path, { withFileTypes: true })
      const files = []
      for(const dirent of dirents) {
        const filepath = `${parent}${dirent.name}`
        if(dirent.isDirectory()) {
          files.push(...await this.#recurseConfig(join(path, dirent.name), showHidden, `${filepath}/`))
        } else if(dirent.isFile()) {
          // Hide filenames ignored by server_files.ignore
          if(!showHidden && await ServerManager.isFileIgnored(dirent.name)) continue

          const ext = dirent.name.split(".").pop()
          if(VALID_CONFIG_EXTS.includes(ext)) {
            files.push(filepath)
          }
        }
      }
      return files
    }
}