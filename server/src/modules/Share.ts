import { stat, readdir, unlink } from 'fs/promises';
import path from 'path'
import SteamAPI, { WorkshopItem } from './steam.js';
import { exec } from 'child_process'

const DOWNLOAD_TIMEOUT = 1000 * 60 * 3

export interface ShareDestination {
    id: string,
    name?: string,
    serverIds?: string[],
    path: string
}

export interface ShareInfo {
    sourceFolder: string;
    destinations: ShareDestination[]
    name: string
  }

export default class Share {
    public name: string
    public sourceFolder: string
    public destinations: Record<string, ShareDestination> = {}

    constructor(shareInfo: ShareInfo) {
        this.name = shareInfo.name,
        this.sourceFolder = shareInfo.sourceFolder
        for(const dest of shareInfo.destinations) {
            this.destinations[dest.id] = dest
        }
    }

    public async getAddonInfo(filename: string) {
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

    public async getInstalledFiles(ext = "vpk") {
        const files = await readdir(this.sourceFolder)
        return files.filter(file => file.endsWith(ext))
    }

    public async isInstalled(filename: string) {
        return (await this.getInstalledFiles()).find(file => file === filename)
    }

    public async install(filename: string, destinationKey: string) {
        const destPath = this.destinations[destinationKey]
        if(!destPath) throw new Error(`Destination "${destinationKey}" does not exist`)
        
        if(!this.doesFileExist(this.sourceFolder, filename)) {
            throw new Error(`File \"${filename}\" does not exist in ${this.sourceFolder}`)
        }

        await execPromise(`ln -sv "${this.sourceFolder}"/${filename} "${destPath}"`)
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
