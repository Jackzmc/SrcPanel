import path from "path";
import Server from "../Server.js";
import Feature from "./Feature.js";
import { readdir, readFile, stat, writeFile } from "fs/promises";
import ServerManager from "../ServerManager.js";
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

const VALID_CONFIG_EXTS = ["cfg", "toml", "yml", "json"]

export default class ConfigsFeature extends Feature {
    #cfgDir: string
    #available: boolean
    #git: SimpleGit | null = null
    constructor(server: Server, configDir: string) {
      super("Configs", server)
      this.#cfgDir = path.normalize(configDir)
    }

    async init() {
        try {
            await stat(this.#cfgDir)
            await this.#setupGit()
            this.#available = true
        } catch(err) {
            this.#available = false
            console.error(`[Server/${this._server.id}] ERROR: Could not access config directory:`, err)
        }
    }

    async #setupGit() {
      // Silent fail if no .git
      if(!await stat(path.join(this.#cfgDir, ".git"))) {
        return
      }
      this.#git = simpleGit(this.#cfgDir)
    }

    get HasGitSupport() {
      return this.#git != undefined
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

    async #recurseConfig(parentPath: string, showHidden: boolean, parent = "") {
      const dirents = await readdir(parentPath, { withFileTypes: true })
      const files = []
      for(const dirent of dirents) {
        const filepath = `${parent}${dirent.name}`
        if(dirent.isDirectory()) {
          files.push(...await this.#recurseConfig(path.join(parentPath, dirent.name), showHidden, `${filepath}/`))
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

    async #getPath(filePath: string, allowIgnored = false) {
      const newPath = path.join(this.configDir, filePath)
      if(!newPath.startsWith(this.configDir)) {
        throw new Error(`Path is invalid, cannot leave config directory`)
      }
      if(!allowIgnored && this.HasGitSupport && await this.#git.checkIgnore([filePath])) {
        throw new Error(`Path is ignored by git`)
      }
      return newPath
    }

    async getFile(filePath: string): Promise<string|null> {
      const newPath = await this.#getPath(filePath)
      return await readFile(newPath, 'utf-8')
    }

    async setFile(filePath: string, content: string, message = "", authorName?: string): Promise<void> {
      const newPath = await this.#getPath(filePath)
      await writeFile(newPath, content)
      await this.#git.add(filePath)
      await this.#git.commit(`Edited file by admin panel: ${message}`, {
        author: `${authorName ?? 'steam'} <steam@admin.jackz.me>`
      })
    }

}