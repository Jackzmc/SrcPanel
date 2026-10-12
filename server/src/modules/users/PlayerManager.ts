import { Pool, RowDataPacket } from "mysql2/promise";
import SteamID from "steamid";
import UserManager from "./UserManager.js";
import { ADMINS_DB, TABLE_PREFIX } from "../../core/index.js";
import AuthManager from "../auth/AuthManager.js";
import { formatPlayer } from "./utils.js";
import PanelPlayer from "./Player.js";
import LRU from 'quick-lru'
import TaskManager from "../tasks/TaskManager.js";

const CACHE_TTL = 1000 * 60 * 5

const NAME_CACHE_TASK_INTERVAL_HRS = 1

export default class PlayerManager {
    static #instance: PlayerManager
    static get instance() { return this.#instance }

    #db: Pool
    #authMngr: AuthManager
    #playerCache: LRU<SteamID, PanelPlayer> = new LRU({ maxAge: CACHE_TTL, maxSize: 1000 })
    #missingNameQueue: Set<SteamID> = new Set() // prob moved to usermanager?
    constructor(db: Pool, authMngr: AuthManager) {
        PlayerManager.#instance = this
        this.#db = db
        this.#authMngr = authMngr

        const task = TaskManager.Instance.register("resolveNames", this.resolveNames)
        TaskManager.Instance.scheduleRepeating(task, { hours: NAME_CACHE_TASK_INTERVAL_HRS })
    }

    enqueueNameResolve(steamid: SteamID) {
        this.#missingNameQueue.add(steamid)
    }
    
    /**
     * Processes names in the resolve queue
     */
    async resolveNames() {
        await UserManager.instance.fetchUsers([...this.#missingNameQueue.keys()])
    }

    get(steamid: SteamID): PanelPlayer {
        const player = new PanelPlayer(this.#db, this.#authMngr, steamid)
        this.#playerCache.set(steamid, player)
        return player
    }

    /**
     * Search for players by a query
     * @param query 
     * @param limit number of players to get
     * @returns lsit of players, with their player entry prepopulated
     */
    async findPlayers(query: string, limit = 10): Promise<PanelPlayer[]> {
        const [rows] = await this.#db.execute<RowDataPacket[]>(
            `SELECT
                account_id,
                last_name,
                last_country,
                last_join_time,
                create_time,
                (SELECT COUNT(*) FROM notes WHERE SUBSTRING(notes.steamid,11) = u.account_id) as notes_count,
                (SELECT COUNT(*) FROM bans WHERE SUBSTRING(bans.steamid,11) = u.account_id) as bans_count,
                (SELECT COUNT(*) FROM ${ADMINS_DB}.sm_admins
                    WHERE SUBSTRING(${ADMINS_DB}.sm_admins.identity,11) = u.account_id
                ) as is_admin
            FROM view_${TABLE_PREFIX}_users u
            WHERE SUBSTRING(steamid, 11) = SUBSTRING(:query, 11) 
                OR last_name LIKE CONCAT('%', :query, '%')
            ORDER BY last_join_time DESC
            LIMIT :limit`,
            { query, limit }
        )
        return rows
            .map(row => {
                const steamid = SteamID.fromIndividualAccountID(row.account_id)
                const playerData = formatPlayer(steamid, row)
                // Side effects but oh well
                if(!playerData.name) this.enqueueNameResolve(steamid)
                const player = new PanelPlayer(this.#db, this.#authMngr, steamid, playerData)
                this.#playerCache.set(steamid, player)
                return player
            })
    }

    /**
     * Returns players who have recently played
     * @param options 
     * @param page page to access, starting at 1
     * @param limit 
     */
    async getRecent(options: { server?: string, ignoreSteamID?: string }, page = 1, limit = 50): Promise<{ player: PanelPlayer, server: string }[]> {
        const offset = (page - 1) * limit
        const [rows] = await this.#db.execute<RowDataPacket[]>(
            `SELECT
                u.account_id as account_id,
                u.last_name as name, 
                u.last_country as country, 
                u.create_time as create_time, 
                u.last_join_time as last_join_time,
                server,
                (SELECT COUNT(*) FROM notes WHERE notes.steamid = client) as notes_count,
                (SELECT COUNT(*) FROM bans WHERE bans.steamid = client) as bans_count,
                (SELECT COUNT(*) FROM \`${ADMINS_DB}\`.sm_admins
                    WHERE SUBSTRING(\`${ADMINS_DB}\`.sm_admins.identity,11) = SUBSTRING(client, 11)
                    LIMIT 1
                ) as is_admin
            FROM activity_log l
            LEFT JOIN view_${TABLE_PREFIX}_user u ON SUBSTRING(client, 11) = u.account_id
            WHERE
                timestamp >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY))
                AND TYPE = 'JOIN'
                AND server = IFNULL(?,server) 
                AND client != ? AND ISNULL(target)
            ORDER BY l.timestamp DESC
            LIMIT ?,?`,
            [options.server || null, options.ignoreSteamID || null, offset, limit]
        )

        return rows.map(row => {
            const steamid = SteamID.fromIndividualAccountID(row.account_id)
            const playerEntry = formatPlayer(steamid, row)
            // Side effects but oh well
            if(!playerEntry.name) this.enqueueNameResolve(steamid)
            const player = new PanelPlayer(this.#db, this.#authMngr, steamid, playerEntry)
            const server = row.server
            return { player, server }
        })

    }
}