import type { Logger as PinoLogger } from 'pino'
import Logger from '../../logger.js'
import Share from './Share.js'
import ShareDatabase from './ShareDB.js'

export enum ScanResult {
    AlreadyActive,
    Success,
    Error
}

export default class ShareScanner {
    #log: PinoLogger
    #share: Share
    #db: ShareDatabase

    #scanning = false
    #scanStart?: number = undefined

    constructor(share: Share, db: ShareDatabase) {
        this.#log = Logger.child({ name: `ShareScanner/${share.id}` })
        this.#share = share
        this.#db = db
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
        if(!this.isScanning) return ScanResult.AlreadyActive
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

        return ScanResult.Success
    }

    // async stop(): Promise<void> {
    //     if(!this.isScanning) return

    // }


    async #scan() {
        const filenames = await this.#db.getFilenames()
        this.#log.debug({ filenames: filenames.size }, "filenames")
    }

}