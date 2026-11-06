import Logger, { PinoLogger } from '#/util/logger.js'
import { Pool } from 'mysql2/promise'
import * as Repo from './BansRepo.js'
import PlayerManager from '../users/PlayerManager.js'
import SteamID from 'steamid'
import type { APIBan, APIBanAppeal, ListAPIBan } from '@srcpanel/common/Ban'

export default class BansManager {
    #pool: Pool
    #playerManager: PlayerManager

    constructor(pool: Pool, playerManager: PlayerManager) {
        this.#pool = pool
        this.#playerManager = playerManager
    }

    async getBan(banId: number): Promise<APIBan | null> {
        return await Repo.getBan(this.#pool, banId)
    }

    async getBans(options: Repo.GetBanOptions): Promise<ListAPIBan[]> {
        const bans = await Repo.getBans(this.#pool, options)
        // Resolve any names we don't have
        for(const ban of bans) {
            if(!ban.client.nameResolver && !ban.client.name && ban.client.id.startsWith("STEAM"))  {
                this.#playerManager.enqueueNameResolve(new SteamID(ban.client.id))
            }
            if(!ban.executor.nameResolver && !ban.executor.name && ban.executor.id.startsWith("STEAM"))  {
                this.#playerManager.enqueueNameResolve(new SteamID(ban.executor.id))
            }
        }
        return bans
    }

    async getBansForUser(steamid: string): Promise<APIBan[]> {
        return await Repo.getBansForUser(this.#pool, steamid)
    }

    async getAppeals(banId: number): Promise<APIBanAppeal[]> {
        return await Repo.getAppeals(this.#pool, banId)
    }

    async getAppealsForUser(steamid: string): Promise<APIBanAppeal[]> {
        return await Repo.getAppealsForUser(this.#pool, steamid)
    }

    async insertBan(options: Repo.InsertBanOptions): Promise<number> {
        return await Repo.insertBan(this.#pool, options)
    }

    async insertBanAppeal(banId: number, message: string, ip: string): Promise<number> {
        return await Repo.insertBanAppeal(this.#pool, banId, message, ip)
    }

    async updateBan(banId: number, options: Repo.EditBanOptions): Promise<boolean> {
        return await Repo.updateBan(this.#pool, banId, options)
    }

    async deleteBan(banId: number): Promise<boolean> {
        return await Repo.deleteBan(this.#pool, banId)
    }
}