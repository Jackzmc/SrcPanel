import path from "path";
import Server from "../Server.js";
import Feature from "./Feature.js";
import { readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import ServerManager from "../ServerManager.js";
import { simpleGit, SimpleGit } from 'simple-git';

const VALID_CONFIG_EXTS = ["cfg", "toml", "yml", "json"]

export interface CommitOptions {
  message?: string,
  author?: string,
}

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
      try {
        await stat(path.join(this.#cfgDir, ".git"))
        this.#git = simpleGit(this.#cfgDir)
      } catch(err) {
        if(err.code === "ENOENT") return
        else console.warn(`[Server::Configs/${this._server.id}]: Failed to access .git at ${this.#cfgDir}:`, err)
      }
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
    public async getConfigFiles(showHidden = false): Promise<string[] | null> {
      if(!this.#cfgDir) return null
      return await this.#recurseConfig(this.#cfgDir, showHidden)
    }

    async #recurseConfig(parentPath: string, showHidden: boolean, parent = "") {
      const dirents = await readdir(parentPath, { withFileTypes: true })
      const files: string[] = []
      for(const dirent of dirents) {
        const filepath = `${parent}${dirent.name}`
        if(dirent.isDirectory()) {
          files.push(...await this.#recurseConfig(path.join(parentPath, dirent.name), showHidden, `${filepath}/`))
        } else if(dirent.isFile()) {
          // Hide filenames ignored by server_files.ignore
          if(!showHidden && await ServerManager.isFileIgnored(dirent.name)) continue

          const ext = dirent.name.split(".").pop()
          if(ext && VALID_CONFIG_EXTS.includes(ext)) {
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
      if(!allowIgnored && this.HasGitSupport && await this.#git!.checkIgnore([filePath])) {
        throw new Error(`Path is ignored by git`)
      }
      return newPath
    }

    async #commit(filePath: string, options: CommitOptions) {
      await this.#git!.add(filePath)
      const msg = options.message ? `Admin panel: ${options.message}` : 'Edited by admin panel'
      await this.#git!.commit(msg, {
        author: `${options.author ?? 'steam'} <steam@admin.jackz.me>`
      })
    }

    async getFile(filePath: string): Promise<string|null> {
      const newPath = await this.#getPath(filePath)
      return await readFile(newPath, 'utf-8')
    }

    async setFile(filePath: string, content: string, options: CommitOptions = {}): Promise<void> {
      const newPath = await this.#getPath(filePath)
      await writeFile(newPath, content)
      await this.#commit(filePath, options)
    }

    async deleteFile(filePath: string, options: CommitOptions = {}): Promise<void> {
      const newPath = await this.#getPath(filePath)
      await unlink(newPath)
      await this.#commit(filePath, options)
    }

    async pull(origin: string = "origin") {
      await this.#git?.pull(origin, undefined, { theirs: 1 })
    }

}