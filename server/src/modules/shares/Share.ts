import { stat, unlink, symlink } from 'fs/promises';
import { createWriteStream } from 'fs'
import path from 'path'
import SteamAPI from '../steam.js';
import { DownloadLogEntry, DownloadProgress, DownloadSource, ExtendedShareInfo, ShareItemState, WebsocketMessage, type AddonInfo, type ChildWorkshopItem, type DownloadSourceRecord, type ShareDestinations, type ShareInfo } from '@srcpanel/common/Share'
import { getChapterIds, serializeWorkshopItem } from './ShareUtils.js';
import Logger from '../../logger.js'
import ShareScanner from './ShareScanner.js';
import ShareDatabase from './ShareDB.js';
import WorkshopDownloadQueue from './DownloadQueue.js';
import EventEmitter from 'events';

const DOWNLOAD_TIMEOUT = 1000 * 60 * 3

const SOURCE: DownloadSource = "steam_workshop"

/**
 * "Installing" refers to symlinking the file from the source directory to the destination(s) specified.
 * In the UI, this is enabling or disabling an addon/file. The source file is not deleted except by deleteAddon()
 */


export default class Share {
  #id: string
  #steamQueue: WorkshopDownloadQueue
  public name: string
  public sourceFolder: string
  public destinations: ShareDestinations = {}
  public appId?: number
  #appTitle: string|null = null
  #db: ShareDatabase
  #scanner: ShareScanner

  private validExts?: string[]
  private downloadSources: DownloadSourceRecord
  #description: string
  #log: typeof Logger

  #event: EventEmitter

  private constructor(shareInfo: ShareInfo, db: ShareDatabase, scanner: ShareScanner, appTitle: string | null, eventEmitter: EventEmitter) {
    this.#log = Logger.child({ name: `Share/${shareInfo.id}` })
    this.#db = db
    this.#scanner = scanner
    this.#appTitle = appTitle
    this.#event = eventEmitter

    this.#id = shareInfo.id!
    this.name = shareInfo.name ?? this.#id!
    if (!shareInfo.sourceFolder) throw new Error(`Share ${this.#id} is missing source folder`)
    this.sourceFolder = shareInfo.sourceFolder
    this.appId = shareInfo.appid
    this.downloadSources = shareInfo.downloadSources || {}
    this.validExts = shareInfo.fileExts
    this.destinations = shareInfo.destinations || {}
    this.#description = shareInfo.description ?? ""

    this.#steamQueue = new WorkshopDownloadQueue(this)
  }

  static async create(steam: SteamAPI, shareInfo: ShareInfo, db: ShareDatabase) {
    const appTitle = shareInfo.appid ? await steam.getAppName(shareInfo.appid) : null

    const eventEmitter = new EventEmitter()

    const scanner = new ShareScanner(shareInfo, db, steam, eventEmitter)

    return new Share(shareInfo, db, scanner, appTitle, eventEmitter)
  }

  get workshopDLQueue() {
    return this.#steamQueue
  }

  get db() {
    return this.#db
  }

  get scanner() {
    return this.#scanner
  }

  get eventStream(): EventEmitter {
    return this.#event
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

  get appTitle() {
    return this.#appTitle
  }

  /**
   * Subscribe to event stream
   * @param cb callback for every event
   * @returns unsubscribe function - call to unsubscribe
   */
  subscribe(cb: (msg: WebsocketMessage) => void) {

    const bound = {
      progress: (data: DownloadProgress, filename?: string) => cb({ 
        type: "event", event: { type: "progress", source: SOURCE, data, itemId: filename } }),
      log: (data: DownloadLogEntry, filename?: string) => cb({ type: "event", event: {
        type: "log", source: SOURCE, data, itemId: filename }}),
      finish: () => cb({ type: "event", event: { type: "finish", source: SOURCE, data: null }}),
    };
    // Maybe a liiitle hacky, but send an event for every log and progress on connect
    this.#steamQueue.logs.forEach((log) => bound.log(log,undefined))
    this.#steamQueue.itemsProgress.forEach((item) => bound.progress(item,undefined))

    for (const [e, fn] of Object.entries(bound)) this.#event.on(e, fn);
    return () => {
        console.log('unsubscribing')
        for (const [e, fn] of Object.entries(bound)) this.#event.removeListener(e, fn);
    };
  }


  /**
   * Creates a write stream for a filename, in the share's source folder
   * @param filename the filename to write to
   */
  public createUploadStream(filename: string) {
    return createWriteStream(path.join(this.sourceFolder, path.normalize(filename)))
  }

  async getAddonInfo(filename: string) {
    return await this.#db.getAddonInfo(filename)
  }

  /**
   * Check if filename is valid (only checks relative to source folder)
   * @param filename 
   * @returns true if valid
   */
  isFileValid(filename: string) {
    const checkPath = path.join(this.sourceFolder, path.normalize(filename))
    return checkPath.startsWith(this.sourceFolder)
  }

  /**
   * Returns all scanned addons
   */
  public async getAddons(): Promise<AddonInfo[]> {
    const addons = await this.#db.getAddons()
    // Not the *best* but we depend on installInfo of what destinations are enabled
    for(const addon of addons) {
      const installInfo = await this.getInstallInfo(addon.filename)
      if(installInfo) addon.installInfo = installInfo.states

    }
   return addons
  }

  /**
   * Requests a scan of addons directory to find missing or new addons
   * @returns if scan started or not
   */
  public requestScan() {
    return this.#scanner.start()
  }

  /**
   * Deletes an addon, removing it from all destinations, source folder, and cache
   * @param filename filename with ext
   */
  public async deleteAddon(filename: string) {
    // Uninstall from all destinations
    await Promise.all(Object.keys(this.destinations)
      .map(destKey => this.disable(filename, destKey))
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
  public async getInstallInfo(
    filename: string
  ): Promise<{ states: Record<string, boolean>, created: number, modified: number, size: number } | undefined> {
    this.#log.trace({ filename }, "getInstallInfo")

    const statInfo = await this.#getFileInfo(this.sourceFolder, filename)
    if(!statInfo) return undefined

    const states: Record<string, boolean> = {}
    if (this.destinations) {
      for (const [id, dest] of Object.entries(this.destinations)) {
        // We just use the first path
        if (!dest.paths || dest.paths.length < 1) continue

        states[id] = false

        try {
          states[id] = await this.#getFileInfo(dest.paths[0], filename) !== null
        } catch(err) {
          this.#log.warn({ filename, dest: id, err }, "get file info failed")
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

  /**
   * Is this file installed (and downloaded), checking the source folder
   * @param filename The filename to check
   * @returns boolean
   */
  public async isInstalled(filename: string) {
    return await this.#getFileInfo(this.sourceFolder, filename) != null
  }

  /**
   * Enables an addon at a destinaton
   * @param filename The filename to enable
   * @param destinationId The destination id to enable on
   * @returns void
   */
  public async enable(filename: string, destinationId: string) {
    const dest = this.destinations[destinationId]
    if (!dest) throw new Error(`Destination "${destinationId}" does not exist`)

    if (!await this.isInstalled(filename)) {
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
   * @param destinationId The destination id to disable on
   * @returns
   */
  public async disable(filename: string, destinationId: string) {
    const dest = this.destinations[destinationId]
    if (!dest) throw new Error(`Destination "${destinationId}" does not exist`)

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
   * @param filename The filename to check
   * @returns Promise<Stats>
   */
  async #getFileInfo(folder: string, filename: string) {
    this.#log.trace({ folder, file: filename }, "getFileInfo")
    try {
      return await stat(path.join(folder, filename))
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
      const chapterIds = getChapterIds(path.join(this.sourceFolder, filename))

      this.#db.upsertAddon(filename, {
        filesize: item.file_size,
        lastModified: item.time_updated
      }, ShareItemState.Ready, { chapterIds })
      this.#db.addWorkshopInfo(filename, serializeWorkshopItem(item), item.collection)
    })
    return event
  }

  // Exports to a saveable object
  public export(): ExtendedShareInfo {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      sourceFolder: this.sourceFolder,
      appid: this.appId,
      appTitle: this.appTitle,
      downloadSources: this.downloadSources,
      destinations: this.destinations,
      fileExts: this.validExts,
    }
  }
}
