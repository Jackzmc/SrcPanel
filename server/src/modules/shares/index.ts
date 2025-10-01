import yaml from 'yaml'
import { join } from 'path'
import { readFile, mkdir, copyFile, unlink } from 'fs/promises'
import { ShareDestination, ShareInfo } from '../../../../common-types/Share.js'
import { doesFileExist } from '../../util.js'
import { open as sqliteOpen } from 'sqlite'
import Share from './Share.js'
import sqlite3 from 'sqlite3';
import SteamAPI from '../../modules/steam.js'
import Logger from '../../logger.js'

const log = Logger.child({ name: "shares" })


async function loadShareData(configDir: string): Promise<{[key: string]: any}> {
    try {
        const content = await readFile(join(configDir, "shares.yml"), 'utf-8')
        return yaml.parse(content)
    } catch(err) {
        throw new Error("Could not parse shares.yml: " + err)
    }
}

async function setupShareFolder(dataDir: string) {
    try {
        await mkdir(join(dataDir, "shares"))
    } catch(err) {
        if(err.code != "EEXIST") throw err
    }
}

const REQUIRED_PROPERTIES = ["name", "sourceFolder"]

export async function loadShares(configDir: string, dataDir: string, steam: SteamAPI): Promise<Record<string, Share>> {
    const startTime = performance.now()
    await setupShareFolder(dataDir)
    
    const raw = await loadShareData(configDir)

    const shares = {}

    for(const [shareId, data] of Object.entries(raw)) {
        const share = await loadShare(dataDir, steam, parseShare(shareId, data))
        shares[shareId] = share
    }
    const time = performance.now() - startTime
    log.info(`Loaded ${Object.keys(shares).length} shares in ${time.toFixed(1)} ms`)
    return shares
}

/**
 * Parses a share from raw object
 * @param shareId the id of server from object's key
 * @param data the raw data
 * @returns 
 */
export function parseShare(shareId: string, data: Record<string, any>): ShareInfo {
    // Check all required properties exist
    for(const prop of REQUIRED_PROPERTIES) {
        if(data[prop] == undefined) {
            log.error(`Share \"${shareId}\" missing required property \"${prop}\"`)
            throw new Error("Missing property " + prop)
        }
    }

    // Check optionally destination paths
    const destinations: Record<string, ShareDestination> = {}
    if(data.destinations) {
        for(const [destId, destData] of Object.entries<Record<string, any>>(data.destinations)) {
            destinations[destId] = {
                paths: destData.paths ?? [],
                restartTargets: destData.restartTargets ?? []
            }
        }
    }

    return {
        id: shareId,
        name: data.name,
        sourceFolder: data.sourceFolder,
        fileExts: data.validExts ?? [],
        appid: data.appid,
        // Default all soruces to 'false'
        downloadSources: {
            steam_workshop: data.downloadSources.steam_workshop ?? false,
            direct: data.downloadSources?.upload ?? data.downloadSources?.direct ?? false
        },
        destinations: destinations
    } 
}

export async function loadShare(dataDir: string, steam: SteamAPI, share: ShareInfo): Promise<Share> {
    // Check if source folder is valid
    if(!await doesFileExist(share.sourceFolder)) {
        throw new Error("Source folder does not exist")
    }

    for(const [destId, dest] of Object.entries(share.destinations)) {
        if(!dest.paths || dest.paths.length === 0) {
            throw new Error("Destination requires minimum of one path")
        }
    }

    await migrateShare(dataDir, share)

    const db = await sqliteOpen({
        filename: join(share.sourceFolder, `share_data.db`),
        driver: sqlite3.Database
    })

    return new Share(db, steam, share)
}

async function migrateShare(dataDir: string, share: ShareInfo) {
    try {
        const oldPath = join(dataDir, "shares", `${share.id.toLowerCase()}_cache.db`)
        const newPath = join(share.sourceFolder, `panel_share.db`)
        await copyFile(oldPath, newPath)
        await unlink(oldPath)
        log.info(`Migrated share ${share.id} [${oldPath}] -> [${newPath}]`)
    } catch(err) {
        if(err.code != "ENOENT") throw err
    }
}