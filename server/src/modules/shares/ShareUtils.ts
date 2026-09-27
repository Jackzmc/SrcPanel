import VPK from '@lowly1337/vpk';
import { AddonWorkshopInfo, WorkshopItem } from '@srcpanel/common/Share';
import { readFile } from 'fs/promises';
import ValveKV from 'valve-kv';

export function getChapterIds(filepath: string): string[] | undefined {
    const vpk = new VPK(filepath)
    vpk.load()
    for(const filepath of vpk.files) {
        if(filepath.startsWith("missions")) {
            const missionData = vpk.getFile(filepath)
            const root = ValveKV.deserialize(missionData.toString('utf-8'))
            const mission = root["mission"]
            if(!mission) return
            const modes = mission["modes"]
            if(!modes) return
            const chapters = modes["coop"]
            if(!chapters) return
            // Sort chapter entries (keys are chapter #) ascendingly
            // { "1": { Map: "...", ... }} -> chapters[1].Map
            const sorted = Object.entries(chapters)
                .sort(([k1, v1],[k2,v2]) => Number(k1) - Number(k2))
                .map(([_, v]) => v)
                .map((v: any) => v.Map)
            return sorted
        }
    }
    return undefined
}

const startPattern = new RegExp(/\s*public\s*Plugin\s*:?myinfo\s*=/)
const fieldPattern = new RegExp(/^\s*([a-z]+)\s*=\s*((".*")|([a-zA-Z_]+))/)
const endPattern = new RegExp(/\s*};/)
const definePattern = new RegExp(/#define ([a-zA-Z_]+)\s*([a-zA-Z_0-9]+|".*")?/)

export interface SpInfo {
    name?: string,
    author?: string,
    description?: string,
    version?: string,
    url?: string
}

export async function getSpFileInfo(filePath: string): Promise<SpInfo> {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/)
    let foundInfo = false
    const info = {}
    const defines = {}
    for(const line of lines) {
        const defineMatch = line.match(definePattern)
        if(defineMatch) {
            // Parse define value into types
            if(defineMatch[2] && defineMatch[2].startsWith('"') && defineMatch[2].endsWith('"')) {
                // string "str" -> str
                defines[defineMatch[1]] = defineMatch[2].substring(1, defineMatch[2].length - 1)
            } else {
                const number = parseFloat(defineMatch[2])
                defines[defineMatch[1]] = isNaN(number) ? null : number
                // parse floats or numbers
                defines[defineMatch[1]] = parseFloat(defineMatch[2])
            }
        } else if(foundInfo) {
            const match = line.match(fieldPattern)
            if(match) {
                if(match[3]) {
                    // Matches string "ex: description"
                    info[match[1]] = match[3].substring(1, match[3].length - 1)
                } else if(match[4]) {
                    // Matches a constant or define, try to find
                    info[match[1]] = defines[match[4]]
                }
            }
            if(line.match(endPattern)) {
                break;
            }

        } else {
            const match = line.match(startPattern)
            if(match) {
                foundInfo = true
            }
        }
    }
    return info
}

export function serializeWorkshopItem(item: WorkshopItem): AddonWorkshopInfo {
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

export async function getMetadata(filepath: string): Promise<Record<string, any>> {
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