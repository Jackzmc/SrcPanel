import { readFile, writeFile } from "fs/promises"
import path from "path"

let cacheObj = {}
let _loaded = false

export class SetCache<T> {
    set: Set<T>
    lastFetchTime: number
    staleTime: number
    cacheKey: string
    #getData: () => Promise<Set<T>>
    #isStaleFn: (fetchTime: number, staleTime: number) => boolean
    constructor(updateFn: () => Promise<Set<T>>, staleTime = 1000 * 60 * 60 * 4) {
        this.#getData = updateFn
        this.staleTime = staleTime
    }
    setDiskCacheKey(key: string) {
        this.cacheKey = key
        const cache = cacheObj[key]
        if(cache) {
            this.set = new Set(cache.set)
            this.lastFetchTime = cache.lastFetchTime
        }
        return this
    }
    setStaleFunction(fn: (fetchTime: number, staleTime: number) => boolean) {
        this.#isStaleFn = fn.bind(this)
        return this
    }
    async fetch() {
        if(this.isStale) this.set = await this.#getData()
        this.lastFetchTime = Date.now()
        if(this.cacheKey) {
            cacheObj[this.cacheKey] = {
                set: [...this.set.values()],
                lastFetchTime: this.lastFetchTime
            }
        }
        return this.set
    }
    get isStale() { 
        if(!this.set) return true
        if(this.#isStaleFn) return this.#isStaleFn(this.lastFetchTime, this.staleTime)
        else return Date.now() - this.lastFetchTime > this.staleTime
    }
}

let _dataPath: string
export default {
    Init(dataDir: string) {
        _dataPath = path.join(dataDir, "set_cache.json")
    },
    async Load() {
        try {
            cacheObj = JSON.parse(await readFile(_dataPath, "utf-8"))
            _loaded = true
        } catch(err) {
            if(err.code != "ENOENT") console.warn(`SetCache.Load: Failed to read cache file: `, err)
        }
    },
    async Save() {
        await writeFile(_dataPath, JSON.stringify(cacheObj))
    }
}
