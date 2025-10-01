import sqlite3 from 'sqlite3'
import sqlite, { open } from 'sqlite'
import SQL from 'sql-template-strings';
import path, { join } from 'path';
import { PanelConfigProvider, PublicConfigMeta } from '../../../common-types/Panel.js';
import yaml from 'yaml'
import { readFile } from 'fs/promises';
import { PanelConfig } from '../../../common-types/Panel';
import Logger from '../logger.js'
const log = Logger.child({ name: "config" })

export interface RegisteredProvider {
    id: string
    name?: string,
}

export class ParseError extends Error {
    constructor(field: string, message: string) {
        super(`Parse failed on ${field}: ${message}`)
    }
}

export default class ConfigManager {
    #filepath: string
    #config: PanelConfig

    constructor(configFilepath: string, config: PanelConfig) {
        this.#filepath = configFilepath
        this.#config = config
    }

    public static async Load(configFolder: string) {
        const filepath = path.join(configFolder, "panel.yml")
        const config = await ConfigManager.#ParseFile(filepath)

        return new ConfigManager(filepath, config)
    }

    static async #ParseFile(filepath: string): Promise<PanelConfig> {
        const contents = await readFile(filepath, 'utf-8')
        const raw = yaml.parse(contents)

        if(!raw.general.public_url) {
            throw new ParseError("public_url", "required field missing")
        }
        let listenPort: number|null = null
        if(raw.general.listen && raw.general.listen.port) {
            const port = parseInt(raw.general.listen.port)
            if(isNaN(port)) throw new ParseError("general.listen.port", "Invalid port number")
            listenPort = port
        }
        if(!raw.general.public_url) throw new ParseError("general.public_url", "required field missing")
        if(!raw.general.public_url.startsWith("http")) throw new ParseError("general.public_url", "public url must include protocol")

        const providers: Record<string, PanelConfigProvider> = {}
        if(raw.providers) {
            const requiredFields = ["client_id", "client_secret", "token_url", "revoke_url", "user_url", "authorize_url", "avatar_url_format"]
            for(const [key, data] of Object.entries<any>(raw.providers)) {
                const provider: Partial<PanelConfigProvider> = {
                    name: data.name,
                }
                for(const field of requiredFields) {
                    if(!data[field]) throw new ParseError(`providers.${key}.${field}`, "required field missing")
                    if(typeof data[field] !== "string") throw new ParseError(`providers.${key}.${field}`, "field must be type string")
                    provider[field] = data[field]
                }

                providers[key] = provider as PanelConfigProvider
            }
        }

        const out: PanelConfig = {
            general: {
                listen: raw.listen && {
                    host: raw.listen.host,
                    port: listenPort
                },
                public_url: raw.public_url
            },
            stats_url: raw.stats_url,
            notice: raw.notice && {
                enabled: Boolean(raw.notice.enabled),
                text: raw.notice.text,
                class: raw.notice.class ?? ""
            } || { enabled: false, text: "", class: "" },
            providers
        }
        return out
    }


    public async Reload() {
        try {
            const newConfig = await ConfigManager.#ParseFile(this.#filepath)
            this.#config = newConfig
        } catch(err) {
            log.error("reload failed: " + err.message)
        }
    }

    public get Config(): PanelConfig {
        return this.#config
    }

    public get PublicMeta(): PublicConfigMeta {
        return {
            notice: this.#config.notice,
            stats_url: this.#config.stats_url,
            domain: this.#config.general.public_url
        }
    }

    public get Domain() {
        return this.#config.general.public_url
    }

    public get Providers() {
        return this.#config.providers
    }

    public GetProvider(key: string): PanelConfigProvider|null {
        return this.#config.providers[key] ?? null
    }
}