import { CoreModules } from "../../core/index.js"
import { FluxerBot } from "./FluxerBot.js"
import Logger from '../../logger.js'

const log = Logger.child({ name: "Bots" })

export interface BotsContainer {
    fluxer: FluxerBot | null
}

export async function loadBots(modules: CoreModules['modules']): Promise<BotsContainer> {
    const result: BotsContainer = {
        fluxer: null
    }
    if(process.env.FLUXER_API_TOKEN && process.env.FLUXER_API_TOKEN != "") {
        log.debug({ }, "loading fluxer bot")
        result.fluxer = await FluxerBot.create(modules.serverManager, modules.cacheManager, process.env.FLUXER_API_TOKEN)
    }

    return result
}
