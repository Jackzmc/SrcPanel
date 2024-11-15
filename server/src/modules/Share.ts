import { stat, readdir, unlink, symlink } from 'fs/promises';
import { createWriteStream } from 'fs'
import path from 'path'
import SteamAPI from './steam.js';
import { AddonCollectionInfo, AddonInfo, AddonWorkshopInfo, ChildWorkshopItem, DownloadSourceRecord, ShareDestination, ShareDestinations, ShareInfo, WorkshopCollectionInfo, WorkshopItem } from '../../../common-types/Share.js'
import sqlite3 from 'sqlite3'
import sqlite from 'sqlite'
import SQL from 'sql-template-strings';
import VPK from '@lowly1337/vpk'
import { readFile } from 'node:fs/promises';
import ValveKV from 'valve-kv'
import { SimpleGit, simpleGit } from 'simple-git';

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
    #destinationsGit: Record<string, SimpleGit> = {}
    public appId?: number
    #db: sqlite.Database<sqlite3.Database, sqlite3.Statement>
    #steam: SteamAPI

    private validExts?: string[]
    private downloadSources: DownloadSourceRecord
    #description: string
    #git: SimpleGit

    constructor(db: sqlite.Database<sqlite3.Database, sqlite3.Statement>, steam: SteamAPI, shareInfo: Partial<ShareInfo>) {
        this.#id = shareInfo.id
        this.#db = db
        this.#steam = steam
        this.name = shareInfo.name ?? shareInfo.id,
        this.sourceFolder = shareInfo.sourceFolder
        this.appId = shareInfo.appid
        this.downloadSources = shareInfo.downloadSources || {}
        this.validExts = shareInfo.fileExts
        this.destinations = shareInfo.destinations || {}
        this.#description = shareInfo.description
        db.exec(SQL`CREATE TABLE IF NOT EXISTS addoncache (
            filename VARCHAR(128) NOT NULL,
            filesize INT,
            lastModified INT,
            ws_info TEXT,
            collection_id VARCHAR(32),
            collection_name VARCHAR(64),
            chapter_ids TEXT,
            PRIMARY KEY (filename)
        );`)
        
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
    #getChapterIds(filepath: string): string[] {
        const vpk = new VPK(filepath)
        try {
            vpk.load()
            for(const filepath of vpk.files) {
                if(filepath.startsWith("missions")) {
                    const missionData = vpk.getFile(filepath)
                    const root = ValveKV.deserialize(missionData.toString('utf-8'))
                    const mission = root["mission"]
                    if(!mission) return null
                    const modes = mission["modes"]
                    if(!modes) return null
                    const chapters = modes["coop"]
                    if(!chapters) return null
                    // Sort chapter entries (keys are chapter #) ascendingly
                    // { "1": { Map: "...", ... }} -> chapters[1].Map
                    const sorted = Object.entries(chapters)
                        .sort(([k1, v1],[k2,v2]) => Number(k1) - Number(k2))
                        .map(([_, v]) => v)
                        .map((v: any) => v.Map)
                    return sorted
                }
            }
        } catch(err) {
            console.warn(`[Share/${this.name}] Skipping vpk with error at ${filepath}:\n`, err.message)
        }
        return null
    }

    /** 
     * Fetches all addons for this share, including returning if the destinations are 
     * Warn: Expensive, may take a long time for a large directory, and if no cache
     **/
    public async getAddons() {
        console.time('getAddons:readdir')
        const dirents = await readdir(this.sourceFolder, { withFileTypes: true }) 
        console.timeEnd('getAddons:readdir')
        const results: (AddonInfo|AddonCollectionInfo)[] = []
        let collections: Record<string, AddonCollectionInfo> = {}
        for(const dirent of dirents) {
            if(dirent.isFile()) {
                // Only check the specified extenstions
                const ext = dirent.name.split(".").pop()
                if(this.validExts && !this.validExts.includes(ext)) continue
            
                const addonInfo = await this.getAddonInfo(dirent.name)
                if(addonInfo) {
                    // If we have cached addon info, check if its a collection or an item
                    if(addonInfo.collection) {
                        if(!collections[addonInfo.collection.id]) collections[addonInfo.collection.id] = { 
                            collection: addonInfo.collection,
                            children: []
                        }
                        collections[addonInfo.collection.id].children.push(addonInfo)
                        // Merge child addon into collection's map list
                        if(addonInfo.chapterIds) {
                            if(!collections[addonInfo.collection.id].chapterIds) collections[addonInfo.collection.id].chapterIds = []
                            // Convert to set and back to remove duplicates
                            const set = new Set([...collections[addonInfo.collection.id].chapterIds, ...addonInfo.chapterIds])
                            collections[addonInfo.collection.id].chapterIds = [...set]
                        }
                        delete addonInfo.collection
                    } else {
                        results.push(addonInfo)
                    }
                } else {
                    // Manually added item, just fs.stat it:
                    const fstat = await stat(path.join(this.sourceFolder, dirent.name))
                    const fsinfo = {
                        filesize: fstat.size,
                        lastModified: Math.round(fstat.mtime.getTime() / 1000),
                    }
                    let chapterIds = null
                    let wsDetails = null
                    if(ext === "vpk") {
                        chapterIds = this.#getChapterIds(path.join(this.sourceFolder, dirent.name))
                        // Check if this is a workshop addon, and fetch its details
                        const wsId = parseInt(dirent.name)
                        if(wsId) {
                            wsDetails = await this.#steam.getItemDetails([wsId.toString()])
                            if(wsDetails.length > 0) {
                                wsDetails = Share.serializeWorkshopItem(wsDetails[0])
                            } else {
                                wsDetails = { deleted: true, publishedfileid: wsId }
                            }
                        }
                    }
                   
                    results.push({
                        filename: dirent.name,
                        ...fsinfo,
                        installInfo: (await this.getInstallInfo(dirent.name)).states,
                        chapterIds
                    })
                    await this.#addAddonEntry(dirent.name, fsinfo, wsDetails, undefined, chapterIds)
                }
            }
        }
        // Calculate total file size for collections
        for(const collection of Object.values(collections)) {
            results.push({
                ...collection,
                filesize: collection.children.reduce((pv, child) => pv + child.filesize, 0)
            })
        }

        return results
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
     * Adds an addon to the cache
     * @param filename the filename with ext
     * @param fsInfo File system info (filesize, lastModified)
     * @param workshop (optional) workshop item details info
     * @param collection (optional) workshop collection info (collection id and name)
     */
    async #addAddonEntry(filename: string, fsInfo?: { filesize: number, lastModified: number }, workshop?: AddonWorkshopInfo, collection?: WorkshopCollectionInfo, chapterIds?: string[]) {
        try {
            // console.debug(`adding \"${filename}\" [fs=${fsInfo != null}] [workshop=${workshop != null}] [collection=${collection != null}]`)
            await this.#db.run(
                SQL`REPLACE INTO addoncache 
                    (filename, filesize, lastModified, ws_info, collection_id, collection_name, chapter_ids) 
                    VALUES(${filename}, ${fsInfo?.filesize}, ${fsInfo?.lastModified}, ${workshop ? JSON.stringify(workshop) : null}, ${collection?.id}, ${collection?.name}, ${chapterIds?.join(",")})`
            )
        } catch(err) {
            console.error(`addAddonEntry failed for "${filename}"`, { fsInfo: fsInfo !== null, workshop: workshop !== undefined }, err)
        }
    }

    /**
     * Get addon info from cache
     * @param filename filename with ext
     * @returns Promise<AddonInfo | undefined>
     */
    public async getAddonInfo(filename: string): Promise<AddonInfo | undefined> {
        const info = await this.#db.get(SQL`SELECT * FROM addoncache WHERE filename = ${filename}`)
        if(!info) return null
        const installInfo = await this.getInstallInfo(filename)
        return {
            filename: info.filename,
            filesize: info.filesize ?? installInfo.size,
            lastModified: info.lastModified ?? installInfo.modified,
            downloaded: installInfo.created,
            workshop: info.ws_info ? JSON.parse(info.ws_info) as AddonWorkshopInfo : undefined,
            installInfo: installInfo.states,
            collection: info.collection_id ? {
                id: info.collection_id,
                name: info.collection_name
            } : null,
            chapterIds: info.chapter_ids?.split(",")
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
        await this.#db.exec(SQL`DELETE FROM addoncache WHERE filename = ${filename}`)
    }

    /**
     * Gets file info and any destinations this file is enabled on
     * @param filename 
     */
    public async getInstallInfo(filename: string): Promise<{ states: Record<string, boolean>, created: number, modified: number, size: number }> {
        const statInfo = await this.#getFileInfo(this.sourceFolder, filename)
        if(statInfo) {
            let states: Record<string, boolean> = {}
            if(this.destinations) {
                for(const [id, dest] of Object.entries(this.destinations)) {
                    // We just use the first path
                    if(!dest.paths) continue
                    states[id] = dest.paths.length > 0 ? await this.#getFileInfo(dest.paths[0], filename) !== null : false
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
        if(!this.validExts) return files
        return files.filter(filename => {
            const ext = filename.split(".").pop()
            return this.validExts.includes(ext)
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
        if(!dest) throw new Error(`Destination "${destinationKey}" does not exist`)
        
        if(!this.#getFileInfo(this.sourceFolder, filename)) {
            throw new Error(`File \"${filename}\" does not exist in ${this.sourceFolder}`)
        }
        try {
            for(const destPath of dest.paths) {
                await symlink(path.join(this.sourceFolder, filename), path.join(destPath, filename))
            }
        } catch(err) {
            // Ignore already installed
            if(err.code == "EEXIST")
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
        if(!dest) throw new Error(`Destination "${destinationKey}" does not exist`)
        
        if(!this.#getFileInfo(this.sourceFolder, filename)) {
            throw new Error(`File \"${filename}\" does not exist in ${this.sourceFolder}`)
        }

        try {
            for(const destPath of dest.paths) {
                await unlink(path.join(destPath, filename))
            }
        } catch(err) {
            // Do not fail if its not installed already, just ignore
            if(err.code !== "ENOENT") throw err
        }
    }

    /**
     * Returns file system info (stat). Folder and file are path.join'd
     * @param folder The folder to check
     * @param file The filename to check
     * @returns Promise<Stats>
     */
    async #getFileInfo(folder: string, file: string) {
        try {
          return await stat(path.join(folder, file))
        } catch(err) {
          if(err.code === "ENOENT") {
            return null
          } else 
            throw err
        }
    } 

    /**
     * Returns a stream of a workshop item download. Emits "finish" and "progress"
     * @param item The workshop item object (needs publishedfileid, file_size, and time_updated)
     * @returns 
     */
    public steamDownloadStream(item: ChildWorkshopItem) {
        const filename = `${item.publishedfileid}.vpk`

        const event = SteamAPI.downloadItemProgress(item, this.sourceFolder, { timeout: DOWNLOAD_TIMEOUT })
        event.addListener("finish", (curBytes, totalBytes) => {
            if(curBytes != item.file_size) {
                throw new Error(`Downloaded size mismatch (downloaded ${curBytes} bytes, expected ${item.file_size} bytes)`)
            }
            const chapterIds = this.#getChapterIds(path.join(this.sourceFolder, filename))

            this.#addAddonEntry(filename, {
                filesize: item.file_size,
                lastModified: item.time_updated
            }, Share.serializeWorkshopItem(item), item.collection, chapterIds)
        })
        return event
    }

    // Exports to a saveable object
    public export(includeId = true): ShareInfo {
        return {
            id: includeId ? this.id : undefined, 
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