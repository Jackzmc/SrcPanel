import { stat, readdir, unlink, symlink } from 'fs/promises';
import { createWriteStream } from 'fs'
import path from 'path'
import SteamAPI from './steam.js';
import { AddonCollectionInfo, AddonInfo, AddonWorkshopInfo, ChildWorkshopItem, DownloadSourceRecord, ShareDestinations, ShareInfo, WorkshopCollectionInfo, WorkshopItem } from '../../../common-types/Share.js'
import sqlite3 from 'sqlite3'
import sqlite from 'sqlite'
import SQL from 'sql-template-strings';

const DOWNLOAD_TIMEOUT = 1000 * 60 * 3

export type DownloadSource = "steam_workshop" | "direct"

export default class Share {
    public _id: string
    public name: string
    public sourceFolder: string
    public destinations: ShareDestinations = {}
    public appId?: number
    private db: sqlite.Database<sqlite3.Database, sqlite3.Statement>
    private steam: SteamAPI

    private validExts?: string[]
    private downloadSources: DownloadSourceRecord

    constructor(db: sqlite.Database<sqlite3.Database, sqlite3.Statement>, steam: SteamAPI, shareInfo: Partial<ShareInfo>) {
        this._id = shareInfo.id
        this.db = db
        this.steam = steam
        this.name = shareInfo.name ?? shareInfo.id,
        this.sourceFolder = shareInfo.sourceFolder
        this.appId = shareInfo.appid
        this.downloadSources = shareInfo.downloadSources || {}
        this.validExts = shareInfo.fileExts
        this.destinations = shareInfo.destinations || {}
        db.exec(SQL`CREATE TABLE IF NOT EXISTS addoncache (
            filename VARCHAR(128) NOT NULL,
            filesize INT,
            lastModified INT,
            ws_info TEXT,
            collection_id VARCHAR(32),
            collection_name VARCHAR(64),
            PRIMARY KEY (filename)
        );`)
    }

    public isExtAllowed(ext: string) {
        return this.validExts === undefined || this.validExts.includes(ext)
    }

    public get sources() {
        return this.downloadSources
    }

    public get exts() {
        return this.validExts ? [...this.validExts] : null
    }

    public get id() {
        return this._id
    }

    public createUploadStream(filename: string) {
        return createWriteStream(path.join(this.sourceFolder, path.normalize(filename)))
    }

    /** 
     * Fetches all addons for this share, including returning if the destinations are 
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
                    results.push({
                        filename: dirent.name,
                        ...fsinfo,
                        installInfo: (await this.getInstallInfo(dirent.name)).states
                    })
                    await this.addAddonEntry(dirent.name, fsinfo)
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

    private static serializeWorkshopItem(item: WorkshopItem): AddonWorkshopInfo {
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
    private async addAddonEntry(filename: string, fsInfo?: { filesize: number, lastModified: number }, workshop?: AddonWorkshopInfo, collection?: WorkshopCollectionInfo) {
        try {
            // console.debug(`adding \"${filename}\" [fs=${fsInfo != null}] [workshop=${workshop != null}] [collection=${collection != null}]`)
            await this.db.run(
                SQL`REPLACE INTO addoncache 
                    (filename, filesize, lastModified, ws_info, collection_id, collection_name) 
                    VALUES(${filename}, ${fsInfo?.filesize}, ${fsInfo?.lastModified}, ${workshop ? JSON.stringify(workshop) : null}, ${collection?.id}, ${collection?.name})`
            )
            // if(fsInfo)
            //     await this.db.run(SQL`INSERT INTO addoncache (filename, filesize, lastModified) VALUES (${filename}, ${fsInfo.filesize}, ${fsInfo.lastModified})`)
            // else
            //     await this.db.run(SQL`INSERT INTO addoncache (filename, ws_info) VALUES (${filename}, ${JSON.stringify(workshop)})`)
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
        const info = await this.db.get(SQL`SELECT * FROM addoncache WHERE filename = ${filename}`)
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
            } : null
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
        await this.db.exec(SQL`DELETE FROM addoncache WHERE filename = ${filename}`)
    }

    /**
     * Gets file info and any destinations this file is enabled on
     * @param filename 
     * @returns { states: Record<string, boolean>, created: number, modified: number, size: number }
     */
    public async getInstallInfo(filename: string) {
        const statInfo = await this.getFileInfo(this.sourceFolder, filename)
        if(statInfo) {
            let states: Record<string, boolean> = {}
            if(this.destinations) {
                for(const [id, dest] of Object.entries(this.destinations)) {
                    states[id] = await this.getFileInfo(dest.path, filename) !== null
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
        
        if(!this.getFileInfo(this.sourceFolder, filename)) {
            throw new Error(`File \"${filename}\" does not exist in ${this.sourceFolder}`)
        }
        try {
            await symlink(path.join(this.sourceFolder, filename), path.join(dest.path, filename))
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
        
        if(!this.getFileInfo(this.sourceFolder, filename)) {
            throw new Error(`File \"${filename}\" does not exist in ${this.sourceFolder}`)
        }

        try {
            await unlink(path.join(dest.path, filename))
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
    private async getFileInfo(folder: string, file: string) {
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
     * Downloads an item from steam workshop, returning once complete
     * @param item The workshop item object (needs publishedfileid, file_size, and time_updated)
     * @returns Promise<void>
     */
    public async steamDownload(item: ChildWorkshopItem) {
        const filename = `${item.publishedfileid}.vpk`

        const bytes = await SteamAPI.downloadItem(item, this.sourceFolder, { timeout: DOWNLOAD_TIMEOUT })
        if(bytes != item.file_size) {
            throw new Error(`Downloaded size mismatch (downloaded ${bytes} bytes, expected ${item.file_size} bytes)`)
        }

        // Update the cache
        await this.addAddonEntry(filename, {
            filesize: item.file_size,
            lastModified: item.time_updated
        }, Share.serializeWorkshopItem(item), item.collection)
        return
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

            this.addAddonEntry(filename, {
                filesize: item.file_size,
                lastModified: item.time_updated
            }, Share.serializeWorkshopItem(item), item.collection)
        })
        return event
    }

    // Exports to a saveable object
    public export(includeId = true): ShareInfo {
        return {
            id: includeId ? this.id : undefined, 
            name: this.name,
            sourceFolder: this.sourceFolder,
            appid: this.appId,
            downloadSources: this.downloadSources,
            destinations: this.destinations,
            fileExts: this.validExts
        }
    }
}