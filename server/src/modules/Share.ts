import { stat, readdir, unlink, symlink } from 'fs/promises';
import { createWriteStream } from 'fs'
import path from 'path'
import SteamAPI, { WorkshopItem } from './steam.js';
import { exec } from 'child_process'
import sqlite3 from 'sqlite3'
import sqlite from 'sqlite'
import SQL from 'sql-template-strings';
import { ChildWorkshopItem, WorkshopCollectionInfo } from '../routes/!!privileged/shares.js';

const DOWNLOAD_TIMEOUT = 1000 * 60 * 3

export interface ShareDestination {
    id: string,
    name?: string,
    serverIds?: string[],
    path: string
}

export interface ShareInfo {
    id: string,
    sourceFolder: string;
    destinations: ShareDestination[],
    appid?: number,
    name: string,
    fileExts?: string[],
    downloadSources?: Record<string, boolean>
}

export interface AddonInfo {
    filename: string,
    filesize?: number,
    downloaded?: number
    lastModified?: number,
    workshop?: AddonWorkshopInfo,
    installInfo: Record<string, boolean>,
    collection?: WorkshopCollectionInfo
}

export interface AddonCollectionInfo {
    collection: WorkshopCollectionInfo, 
    children: AddonInfo[]
}
export interface AddonWorkshopInfo {
    publishedfileid: number
    deleted: boolean,
    title: string,
    filesize: number,
    fileUrl: string,
    previewUrl: string,
    description: string,
    lastUpdated: number
}

interface AddonInstallInfo {
    states: Record<string, boolean>, 
    created: number,
    modified: number,
    size: number
}

export const enum DownloadSourceE {
    DirectUpload = 1,
    SteamWorkshop = 2
}

export const DOWNLOAD_SOURCES = ["steam_workshop", "direct"] as const

export type DownloadSource = typeof DOWNLOAD_SOURCES

const WS_ITEMID_REGEX = new RegExp(/^(\d+).vpk$/)

export default class Share {
    public id: string
    public name: string
    public sourceFolder: string
    public destinations: Record<string, ShareDestination> = {}
    public appId?: number
    private db: sqlite.Database<sqlite3.Database, sqlite3.Statement>
    private steam: SteamAPI

    private validExts?: string[]
    private downloadSources: DownloadSource[] = []

    constructor(db: sqlite.Database<sqlite3.Database, sqlite3.Statement>, steam: SteamAPI, shareInfo: Partial<ShareInfo>) {
        this.id = shareInfo.id
        this.db = db
        this.steam = steam
        this.name = shareInfo.name ?? shareInfo.id,
        this.sourceFolder = shareInfo.sourceFolder
        this.appId = shareInfo.appid
        this._parseDownloadSources(shareInfo.downloadSources)
        this.validExts = shareInfo.fileExts
        for(const dest of shareInfo.destinations) {
            this.destinations[dest.id] = dest
        }
        db.exec(SQL`CREATE TABLE IF NOT EXISTS addoncache (
            filename VARCHAR(128) NOT NULL,
            filesize INT,
            lastModified INT,
            ws_info TEXT,
            PRIMARY KEY (filename)
        );`)
    }

    private _parseDownloadSources(downloadSources?: Record<string, boolean>) {
        if(downloadSources) {
            for(const [src, enabled] of Object.entries(downloadSources)) {
                if((DOWNLOAD_SOURCES as ReadonlyArray<string>).includes(src)) {
                    if(enabled)
                        this.downloadSources.push(src as unknown as DownloadSource) 
                } else {
                    console.log(`Share/${this.name}: Unknown download source ${src}`)
                }
            }
        }
    }

    public isExtAllowed(ext: string) {
        return this.validExts === undefined || this.validExts.includes(ext)
    }

    public get sources() {
        return [...this.downloadSources]
    }

    public get exts() {
        return this.validExts ? [...this.validExts] : null
    }

    public createUploadStream(filename: string) {
        return createWriteStream(path.join(this.sourceFolder, path.normalize(filename)))
    }

    public async getAddons() {
        const dirents = await readdir(this.sourceFolder, { withFileTypes: true }) 
        const steamResolveQueue: string[] = [] // Array of workshop ids
        const results: (AddonInfo|AddonCollectionInfo)[] = []
        let collections: Record<string, AddonCollectionInfo> = {}
        for(const dirent of dirents) {
            if(dirent.isFile()) {
                // Only fetch the specified extenstions
                const ext = dirent.name.split(".").pop()
                if(this.validExts && !this.validExts.includes(ext)) continue


                const addonInfo = await this.getAddonInfo(dirent.name)
                if(addonInfo) {
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
                    const match = dirent.name.match(WS_ITEMID_REGEX)
                    const isSteamItem = match && match.length == 2
                    if(isSteamItem) {
                        // Put in queue to be resolved in batches of 100
                        steamResolveQueue.push(match[1])
                    } else {
                        // It has no valid steam workshop id, so just query filesystem
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
        }

        for(const collection of Object.values(collections)) {
            results.push({
                ...collection,
                filesize: collection.children.reduce((pv, child) => pv + child.filesize, 0)
            })
        }

        while(steamResolveQueue.length > 0) {
            const slice = steamResolveQueue.splice(0, 100)
            const wsDetails = await this.steam.getItemDetails(slice)
            for(let i = 0; i < wsDetails.length; i++) {
                const filename = `${wsDetails[i].publishedfileid || slice[i]}.vpk`
                const workshop = Share.serializeWorkshopItem(wsDetails[i])
                results.push({
                    filename,
                    installInfo: (await this.getInstallInfo(filename)).states,
                    workshop
                })

                await this.addAddonEntry(filename, null, workshop)
            }
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

    private async addAddonEntry(filename: string, fsInfo?: { filesize: number, lastModified: number }, workshop?: AddonWorkshopInfo, collection?: WorkshopCollectionInfo) {
        try {
            console.debug(`adding \"${filename}\" [fs=${fsInfo != null}] [workshop=${workshop != null}] [collection=${collection != null}]`)
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

    public async getInstallInfo(filename: string) {
        const statInfo = await this.doesFileExist(this.sourceFolder, filename)
        if(statInfo) {
            let states: Record<string, boolean> = {}
            if(this.destinations) {
                for(const dest of Object.values(this.destinations)) {
                states[dest.id] = await this.doesFileExist(dest.path, filename) !== null
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

    public async getInstalledFiles() {
        const files = await readdir(this.sourceFolder)
        if(!this.validExts) return files
        return files.filter(filename => {
            const ext = filename.split(".").pop()
            return this.validExts.includes(ext)
        })
    }

    public async isInstalled(query: string) {
        return (await this.getInstalledFiles())
            .find(filename => filename === query)
    }

    public async install(filename: string, destinationKey: string) {
        const dest = this.destinations[destinationKey]
        if(!dest) throw new Error(`Destination "${destinationKey}" does not exist`)
        
        if(!this.doesFileExist(this.sourceFolder, filename)) {
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

    public async uninstall(filename: string, destinationKey: string) {
        const dest = this.destinations[destinationKey]
        if(!dest) throw new Error(`Destination "${destinationKey}" does not exist`)
        
        if(!this.doesFileExist(this.sourceFolder, filename)) {
            throw new Error(`File \"${filename}\" does not exist in ${this.sourceFolder}`)
        }

        try {
            await unlink(path.join(dest.path, filename))
        } catch(err) {
            // Do not fail if its not installed already, just ignore
            if(err.code !== "ENOENT") throw err
        }
    }

    private async doesFileExist(folder: string, file: string) {
        try {
          return await stat(path.join(folder, file))
        } catch(err) {
          if(err.code === "ENOENT") {
            return null
          } else 
            throw err
        }
    } 

      
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
        return true
    }
}


async function execPromise(command: string): Promise<string> {
    return new Promise(function(resolve, reject) {
        exec(command, (error: Error, stdout: string, stderr: string) => {
            if (error) {
                reject(error + "\n" + stderr.trim());
                return;
            }
            resolve(stdout.trim());
        });
    });
}
