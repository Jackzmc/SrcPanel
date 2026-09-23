import type { Logger as PinoLogger } from 'pino'
import Logger from '../../logger.js'
import Share from './Share.js'
import ShareDatabase from './ShareDB.js'
import SteamAPI from '../steam.js'
import { ShareInfo, ShareItemState } from '@srcpanel/common/Share'
import { readdir } from 'node:fs/promises'

export enum ScanResult {
    AlreadyActive,
    Success,
    Error
}

export default class ShareScanner {
    #log: PinoLogger
    #share: ShareInfo
    #db: ShareDatabase
    #steam: SteamAPI

    #scanning = false
    #scanStart?: number = undefined

    constructor(share: ShareInfo, db: ShareDatabase, steam: SteamAPI) {
        this.#log = Logger.child({ name: `ShareScanner/${share.id}` })
        this.#share = share
        this.#db = db
        this.#steam = steam
    }

    /**
     * Is a scan active for this share?
     */
    get isScanning() { return this.#scanStart && this.#scanStart > 0 }

    /** Get the time in unix milliseconds when scan was started
     * @returns null if scan inactive, otherwise unix ms from epoch 
    */
    get scanTimeStarted() {
        return this.isScanning ? this.#scanStart : null
    }

    /** Get the time in unix milliseconds that have elapsed
     * @returns null if scan inactive, otherwise duration in ms 
     */
    get scanTimeElapsed() {
        return this.#scanStart ? Date.now() - this.#scanStart : null
    }

    /** Start a scan
     * ScanResult.AlreadyActive if already active
     */
    async start(): Promise<ScanResult> {
        if(this.isScanning) return ScanResult.AlreadyActive
        this.#scanStart = Date.now()

        this.#log.info(`Starting scan of share ${this.#share.name}`)

        try {
            await this.#scan()
        } catch(err) {
            this.#log.error({}, "scan failed: " + err)
            return ScanResult.Error
        }

        const durationSec = Math.round(( Date.now() - this.#scanStart ) / 1000)
        this.#log.info(`Scan took ${durationSec} seconds`)

        this.#scanStart = undefined

        return ScanResult.Success
    }

    // async stop(): Promise<void> {
    //     if(!this.isScanning) return

    // }

    async #checkAddon(filename: string) {
        if(filename.endsWith(".vpk")) {
            const id = parseInt(filename)
            if(!isNaN(id) && id > 0) {
                this.#steam.addToWSResolveQueue(id, (item) => {

                })
            }
        }
    }

    async #scan() {
        const unchecked = await this.#db.getFilenames()
        const dirents = await readdir(this.#share.sourceFolder, { withFileTypes: true })
        for(const dirent of dirents) {
            if(!dirent.isFile()) continue
            unchecked.delete(dirent.name)

            const entry = await this.#db.getAddonInfo(dirent.name)
            if(!entry || entry.state == ShareItemState.Missing) {
                await this.#checkAddon(dirent.name)
            }
        }
        // Process all missing steam data
        await this.#steam.resolveWSQueue()
        await this.#db.markMissing(unchecked)

            // console.time('getAddons:readdir')
            // const dirents = await readdir(this.sourceFolder, { withFileTypes: true })
            // console.timeEnd('getAddons:readdir')
            // const results: (AddonInfo | AddonCollectionInfo)[] = []
            // const collections: Record<string, AddonCollectionInfo> = {}
            // for (const dirent of dirents) {
            //   if(!dirent.isFile()) continue
            //   // Only check the specified extenstions
            //   const ext = dirent.name.split(".").pop()
            //   if (!ext || ext == "db" || this.validExts && !this.validExts.includes(ext)) continue
        
            //   try {
            //     const addonInfo = await this.getAddonInfo(dirent.name)
            //     if (addonInfo) {
            //       // If we have cached addon info, check if its a collection or an item
            //       if (addonInfo.collection) {
            //         if (!collections[addonInfo.collection.id]) collections[addonInfo.collection.id] = {
            //           collection: addonInfo.collection,
            //           children: [],
            //         }
            //         collections[addonInfo.collection.id].children.push(addonInfo)
            //         // Merge child addon into collection's map list
            //         if (addonInfo.meta.chapterIds) {
            //           if (!collections[addonInfo.collection.id].chapterIds) collections[addonInfo.collection.id].chapterIds = []
            //           // Convert to set and back to remove duplicates
            //           const set = new Set([...collections[addonInfo.collection.id].chapterIds!, ...addonInfo.meta.chapterIds])
            //           collections[addonInfo.collection.id].chapterIds = [...set]
            //         }
            //         delete addonInfo.collection
            //       } else {
            //         results.push(addonInfo)
            //       }
            //     } else {
            //       // Manually added item, just fs.stat it:
            //       const fstat = await stat(path.join(this.sourceFolder, dirent.name))
            //       const fsinfo = {
            //         filesize: fstat.size,
            //         lastModified: Math.round(fstat.mtime.getTime() / 1000),
            //       }
            //       const meta = await this.#getMetadata(path.join(this.sourceFolder, dirent.name))
            //       let pendingResolve = false
            //       if (ext === "vpk") {
            //         // Check if this is a workshop addon, and fetch its details
            //         const wsId = parseInt(dirent.name)
            //         if (wsId) {
            //           pendingResolve = true
            //           this.#steam.addToWSResolveQueue(wsId, async (item) => {
            //             const details: AddonWorkshopInfo = item
            //               ? Share.serializeWorkshopItem(item)
            //               : { deleted: true, publishedfileid: wsId }
            //             await this.#addAddonEntry(dirent.name, fsinfo, details, undefined, meta)
            //           })
        
            //         }
            //       }
        
            //       try {
            //         results.push({
            //           filename: dirent.name,
            //           ...fsinfo,
            //           installInfo: (await this.getInstallInfo(dirent.name))!.states,
            //           meta
            //         })
        
            //         if (!pendingResolve)
            //           await this.#addAddonEntry(dirent.name, fsinfo, undefined, undefined, meta)
            //       } catch(err) {
            //         this.#log.error({ filename: dirent.name }, "failed to retrieve install info")
            //       }
            //     }
            //   } catch(err) {
            //     this.#log.error({ filename: dirent.name }, "failed to retrieve addon info")
            //   }
            // }
            // await this.#steam.resolveWSQueue()
            // // Calculate total file size for collections
            // for (const collection of Object.values(collections)) {
            //   results.push({
            //     ...collection,
            //     filesize: collection.children.reduce((pv, child) => pv + (child.filesize ?? 0), 0),
            //     meta: {}
            //   })
            // }
            // return results
    }

}