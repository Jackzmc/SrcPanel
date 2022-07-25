import { stat, readdir, unlink } from 'fs/promises';
import path from 'path'
import SteamAPI, { WorkshopItem } from './steam.js';
import { exec } from 'child_process'
import sqlite3 from 'sqlite3'
import sqlite from 'sqlite'
import SQL from 'sql-template-strings';

const DOWNLOAD_TIMEOUT = 1000 * 60 * 3

export interface ShareDestination {
    id: string,
    name?: string,
    serverIds?: string[],
    path: string
}

export interface ShareInfo {
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
    lastModified?: number,
    workshop?: AddonWorkshopInfo,
    installInfo: Record<string, boolean>
}
export interface AddonWorkshopInfo {
    deleted: boolean,
    title: string,
    filesize: number,
    fileUrl: string,
    previewUrl: string,
    description: string,
    lastUpdated: number
}

export const DOWNLOAD_SOURCES = ["steam_workshop"] as const

export type DownloadSource = typeof DOWNLOAD_SOURCES

const WS_ITEMID_REGEX = new RegExp(/^(\d+).vpk$/)

export default class Share {
    public name: string
    public sourceFolder: string
    public destinations: Record<string, ShareDestination> = {}
    public appId?: number
    private db: sqlite.Database<sqlite3.Database, sqlite3.Statement>
    private steam: SteamAPI

    private validExts?: string[]
    private downloadSources: DownloadSource[] = []

    constructor(db: sqlite.Database<sqlite3.Database, sqlite3.Statement>, steam: SteamAPI, shareInfo: Partial<ShareInfo>) {
        this.db = db
        this.steam = steam
        this.name = shareInfo.name,
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

    public async getAddons() {
        const dirents = await readdir(this.sourceFolder, { withFileTypes: true }) 
        const steamResolveQueue: string[] = [] // Array of workshop ids
        const results: AddonInfo[] = []
        for(const dirent of dirents) {
            if(dirent.isFile()) {
                // Only fetch the specified extenstions
                const ext = dirent.name.split(".").pop()
                if(this.validExts && !this.validExts.includes(ext)) continue

                const addonInfo = await this.getAddonInfo(dirent.name)
                if(addonInfo) {
                    results.push(addonInfo)
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
                            installInfo: await this.getInstallInfo(dirent.name)
                        })
                        await this.addAddonEntry(dirent.name, fsinfo)
                    }
                }
            }
        }

        while(steamResolveQueue.length > 0) {
            const slice = steamResolveQueue.splice(0, 100)
            const wsDetails = await this.steam.getItemDetails(slice)
            for(let i = 0; i < wsDetails.length; i++) {
                const filename = `${wsDetails[i].publishedfileid || slice[i]}.vpk`
                const workshop = {
                    deleted: wsDetails[i].title === undefined,
                    title: wsDetails[i].title,
                    filesize: wsDetails[i].file_size,
                    fileUrl: wsDetails[i].file_url,
                    previewUrl: wsDetails[i].preview_url,
                    description: wsDetails[i].description,
                    lastUpdated: wsDetails[i].time_updated
                }

                results.push({
                    filename,
                    installInfo: await this.getInstallInfo(filename),
                    workshop
                })

                await this.addAddonEntry(filename, null, workshop)
            }
        } 

        return results
    }

    private async addAddonEntry(filename: string, fsInfo?: { filesize: number, lastModified: number }, workshop?: AddonWorkshopInfo) {
        try {
            if(fsInfo)
                await this.db.run(SQL`INSERT INTO addoncache (filename, filesize, lastModified) VALUES (${filename}, ${fsInfo.filesize}, ${fsInfo.lastModified})`)
            else
                await this.db.run(SQL`INSERT INTO addoncache (filename, ws_info) VALUES (${filename}, ${JSON.stringify(workshop)})`)
        } catch(err) {
            console.error(`addAddonEntry failed for "${filename}"`, { fsInfo: fsInfo !== null, workshop: workshop !== undefined }, err)
        }
    }

    public async getAddonInfo(filename: string): Promise<AddonInfo | undefined> {
        const info = await this.db.get(SQL`SELECT * FROM addoncache WHERE filename = ${filename}`)
        if(!info) return
        return {
            filename: info.filename,
            filesize: info.filesize,
            lastModified: info.lastModified,
            workshop: info.ws_info ? JSON.parse(info.ws_info) as AddonWorkshopInfo : undefined,
            installInfo: await this.getInstallInfo(filename)
        }
    }


    public async getInstallInfo(filename: string) {
        if(await this.doesFileExist(this.sourceFolder, filename)) {
          let states: Record<string, boolean> = {}
          if(this.destinations) {
            for(const dest of Object.values(this.destinations)) {
              states[dest.id] = await this.doesFileExist(dest.path, filename)
            }
          }
          return states
        }
        return undefined
        
    }

    public async getInstalledFiles() {
        const files = await readdir(this.sourceFolder)
        if(!this.validExts) return files
        return files.filter(filename => {
            const ext = filename.split(",").pop()
            return this.validExts.includes(ext)
        })
    }

    public async isInstalled(query: string) {
        return (await this.getInstalledFiles()).find(filename => filename === query)
    }

    public async install(filename: string, destinationKey: string) {
        const dest = this.destinations[destinationKey]
        if(!dest) throw new Error(`Destination "${destinationKey}" does not exist`)
        
        if(!this.doesFileExist(this.sourceFolder, filename)) {
            throw new Error(`File \"${filename}\" does not exist in ${this.sourceFolder}`)
        }

        await execPromise(`ln -sv "${this.sourceFolder}"/${filename} "${dest.path}"`)
    }

    public async uninstall(filename: string, destinationKey: string) {
        const dest = this.destinations[destinationKey]
        if(!dest) throw new Error(`Destination "${destinationKey}" does not exist`)
        
        if(!this.doesFileExist(this.sourceFolder, filename)) {
            throw new Error(`File \"${filename}\" does not exist in ${this.sourceFolder}`)
        }

        await unlink(path.join(dest.path, filename))
    }

    private async doesFileExist(folder: string, file: string) {
        try {
          await stat(path.join(folder, file))
          return true
        } catch(err) {
          if(err.code === "ENOENT") {
            return false
          } else 
            throw err
        }
    } 

      
    public async steamDownload(item: WorkshopItem) {
        const bytes = await SteamAPI.downloadItem(item, this.sourceFolder, { timeout: DOWNLOAD_TIMEOUT })
        if(bytes != item.file_size) {
            throw new Error(`Downloaded size mismatch (downloaded ${bytes} bytes, expected ${item.file_size} bytes)`)
        }
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
