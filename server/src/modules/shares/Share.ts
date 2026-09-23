import { stat, readdir, unlink, symlink } from 'fs/promises';
import { createWriteStream } from 'fs'
import path from 'path'
import SteamAPI from '../steam.js';
import type { AddonCollectionInfo, AddonInfo, AddonWorkshopInfo, ChildWorkshopItem, DownloadSourceRecord, ShareDestinations, ShareInfo, WorkshopCollectionInfo, WorkshopItem } from '@srcpanel/common/Share'
import sqlite3 from 'sqlite3'
import sqlite from 'sqlite'
import { SQL } from 'sql-template-strings';
import VPK from '@lowly1337/vpk'
import ValveKV from 'valve-kv'
import { getChapterIds, getSpFileInfo } from './ShareUtils.js';
import assert from 'assert';
import Logger from '../../logger.js'
import ShareScanner from './ShareScanner.js';
import ShareDatabase from './ShareDB.js';

const DOWNLOAD_TIMEOUT = 1000 * 60 * 3

export type DownloadSource = "steam_workshop" | "direct"

/**
 * "Installing" refers to symlinking the file from the source directory to the destination(s) specified.
 * In the UI, this is enabling or disabling an addon/file. The source file is not deleted except by deleteAddon()
 */

export default class Share {
  #id: string
  public name: string
  public sourceFolder: string
  public destinations: ShareDestinations = {}
  public appId?: number
  #db: ShareDatabase
  #scanner: ShareScanner

  private validExts?: string[]
  private downloadSources: DownloadSourceRecord
  #description: string
  #log: typeof Logger

  constructor(shareInfo: ShareInfo, db: ShareDatabase, scanner: ShareScanner) {
    this.#log = Logger.child({ name: `Share/${shareInfo.id}` })
    this.#db = db
    this.#scanner = scanner

    this.#id = shareInfo.id!
    this.name = shareInfo.name ?? this.#id!
    if (!shareInfo.sourceFolder) throw new Error(`Share ${this.#id} is missing source folder`)
    this.sourceFolder = shareInfo.sourceFolder
    this.appId = shareInfo.appid
    this.downloadSources = shareInfo.downloadSources || {}
    this.validExts = shareInfo.fileExts
    this.destinations = shareInfo.destinations || {}
    this.#description = shareInfo.description ?? ""

    // db.exec(SQL`ALTER TABLE addoncache
    //     ADD COLUMN chapter_ids TEXT;`).catch(() => {})
  }

  public get id() { return this.#id }

  public isExtAllowed(ext: string) {
    return this.validExts === undefined || this.validExts.includes(ext)
  }

  public get description() {
    return this.#description
  }

  public get sources() {
    return this.downloadSources
  }

  public get exts() {
    return this.validExts ? [...this.validExts] : null
  }

  /**
   * Creates a write stream for a filename, in the share's source folder
   * @param filename the filename to write to
   */
  public createUploadStream(filename: string) {
    return createWriteStream(path.join(this.sourceFolder, path.normalize(filename)))
  }

  /**
   * Parse a given VPK file, and return the map file names or chapter ids, from the missions/*.txt file
   * @param filepath
   * @returns string[] map file names without .bsp ext (ex: ["c1m1_hotel", ...])
   */
  #getChapterIds(filepath: string): string[] | null {
    const vpk = new VPK(filepath)
    try {
      vpk.load()
      for (const filepath of vpk.files) {
        if (filepath.startsWith("missions")) {
          const missionData = vpk.getFile(filepath)
          const root = ValveKV.deserialize(missionData.toString('utf-8'))
          const mission = root["mission"]
          if (!mission) return null
          const modes = mission["modes"]
          if (!modes) return null
          const chapters = modes["coop"]
          if (!chapters) return null
          // Sort chapter entries (keys are chapter #) ascendingly
          // { "1": { Map: "...", ... }} -> chapters[1].Map
          const sorted = Object.entries(chapters)
            .sort(([k1, v1], [k2, v2]) => Number(k1) - Number(k2))
            .map(([_, v]) => v)
            .map((v: any) => v.Map)
          return sorted
        }
      }
    } catch (err: any) {
      this.#log.warn(`Skipping vpk with error at ${filepath}:\n`, err.message)
    }
    return null
  }

  async #getMetadata(filepath: string): Promise<Record<string, any>> {
    if (filepath.endsWith(".vpk")) {
      return {
        chapterIds: getChapterIds(filepath)
      }
    } else if (filepath.endsWith(".sp")) {
      return {
        pluginInfo: await getSpFileInfo(filepath)
      }
    }
    return {}
  }

  /**
   * @deprecated
   */
  async getAddonInfo(filename: string) {
    return await this.#db.getAddonInfo(filename)
  }

  /**
   * Fetches all addons for this share, including returning if the destinations are
   * Warn: Expensive, may take a long time for a large directory, and if no cache
   **/
  // TODO: this is verrry messy now and hacky. SRCPNL-129
  // NOTE: this causes a large memory spike while mid check. container was using >= 512MB and hit limit 
  public async getAddons(): Promise<AddonInfo[]> {
    return []
  }

  static serializeWorkshopItem(item: WorkshopItem): AddonWorkshopInfo {
    return {
      deleted: item.title === undefined,
      title: item.title,
      filesize: item.file_size,
      fileUrl: item.file_url,
      previewUrl: item.preview_url,
      description: item.description,
      lastUpdated: item.time_updated,
      publishedfileid: Number(item.publishedfileid)
    }
  }

  /**
   * Deletes an addon, removing it from all destinations, source folder, and cache
   * @param filename filename with ext
   */
  public async deleteAddon(filename: string) {
    // Uninstall from all destinations
    await Promise.all(Object.keys(this.destinations)
      .map(destKey => this.uninstall(filename, destKey))
    )
    // Delete the source file
    await unlink(path.join(this.sourceFolder, filename))
    // Remove cache from database
    await this.#db.remove(filename)
    this.#log.debug({ filename }, "deleted addon")
  }

  /**
   * Gets file info and any destinations this file is enabled on
   * @param filename
   */
  public async getInstallInfo(filename: string): Promise<{ states: Record<string, boolean>, created: number, modified: number, size: number } | undefined> {
    this.#log.trace({ filename }, "getInstallInfo")
    const statInfo = await this.#getFileInfo(this.sourceFolder, filename)
    if (statInfo) {
      const states: Record<string, boolean> = {}
      if (this.destinations) {
        for (const [id, dest] of Object.entries(this.destinations)) {
          // We just use the first path
          if (!dest.paths || dest.paths.length < 1) continue

          states[id] = false
          try {
            states[id] = await this.#getFileInfo(dest.paths[0], filename) !== null
          } catch(err) {
            this.#log.warn({ filename, dest: id }, "failed to get file info: " + err)
          }
        }
      }
      return {
        states,
        created: Math.ceil(statInfo.birthtimeMs / 1000),
        modified: Math.ceil(statInfo.mtimeMs / 1000),
        size: statInfo.size
      }
    }
    return undefined

  }

  /**
   * Returns all files in source folder with the allowed extenstions
   * @returns string[]
   */
  public async getInstalledFiles() {
    const files = await readdir(this.sourceFolder)
    if (!this.validExts) return files
    return files.filter(filename => {
      const ext = filename.split(".").pop()
      return ext && this.validExts!.includes(ext)
    })
  }

  /**
   * Is this file installed (and downloaded), checking the source folder
   * @param query The filename to check
   * @returns boolean
   */
  public async isInstalled(query: string) {
    const file = (await this.getInstalledFiles())
      .find(filename => filename === query)
    return file != null
  }

  /**
   * Enables an addon at a destinaton
   * @param filename The filename to enable
   * @param destinationKey The destination id to enable on
   * @returns void
   */
  public async install(filename: string, destinationKey: string) {
    const dest = this.destinations[destinationKey]
    if (!dest) throw new Error(`Destination "${destinationKey}" does not exist`)

    if (!this.#getFileInfo(this.sourceFolder, filename)) {
      throw new Error(`File "${filename}" does not exist in ${this.sourceFolder}`)
    }
    try {
      for (const destPath of dest.paths) {
        await symlink(path.join(this.sourceFolder, filename), path.join(destPath, filename))
      }
    } catch (err: any) {
      // Ignore already installed
      if (err.code == "EEXIST")
        return
      throw err
    }
  }

  /**
   * Disables an addon from a destinaton
   * @param filename The filename to disable
   * @param destinationKey The destination id to disable on
   * @returns
   */
  public async uninstall(filename: string, destinationKey: string) {
    const dest = this.destinations[destinationKey]
    if (!dest) throw new Error(`Destination "${destinationKey}" does not exist`)

    if (!this.#getFileInfo(this.sourceFolder, filename)) {
      throw new Error(`File "${filename}" does not exist in ${this.sourceFolder}`)
    }

    try {
      for (const destPath of dest.paths) {
        await unlink(path.join(destPath, filename))
      }
    } catch (err: any) {
      // Do not fail if its not installed already, just ignore
      if (err.code !== "ENOENT") throw err
    }
  }

  /**
   * Returns file system info (stat). Folder and file are path.join'd. Returns null if ENOENT
   * @param folder The folder to check
   * @param file The filename to check
   * @returns Promise<Stats>
   */
  async #getFileInfo(folder: string, file: string) {
    this.#log.trace({ folder, file }, "getFileInfo")
    try {
      return await stat(path.join(folder, file))
    } catch (err: any) {
      if (err.code === "ENOENT") {
        this.#log.debug({}, "getFileInfo ENOENT: " + err)
        return null
      } else
        throw err
    }
  }

  /**
   * Returns a stream of a workshop item dgetFileInfoownload. Emits "finish" and "progress"
   * @param item The workshop item object (needs publishedfileid, file_size, and time_updated)
   * @returns
   */
  public steamDownloadStream(item: ChildWorkshopItem) {
    const filename = `${item.publishedfileid}.vpk`

    const event = SteamAPI.downloadItemProgress(item, this.sourceFolder, { timeout: DOWNLOAD_TIMEOUT })
    event.addListener("finish", (curBytes, totalBytes) => {
      if (curBytes != item.file_size) {
        throw new Error(`Downloaded size mismatch (downloaded ${curBytes} bytes, expected ${item.file_size} bytes)`)
      }
      const chapterIds = this.#getChapterIds(path.join(this.sourceFolder, filename))

      this.#db.addAddonEntry(filename, {
        filesize: item.file_size,
        lastModified: item.time_updated
      }, Share.serializeWorkshopItem(item), item.collection, { chapterIds })
    })
    return event
  }

  // Exports to a saveable object
  public export(): ShareInfo {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      sourceFolder: this.sourceFolder,
      appid: this.appId,
      downloadSources: this.downloadSources,
      destinations: this.destinations,
      fileExts: this.validExts,
    }
  }
}
