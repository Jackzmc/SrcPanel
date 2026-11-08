import path from 'path';
import type { PanelConfigProvider, PublicConfigMeta } from '@srcpanel/common/Panel';
import yaml from 'yaml'
import { readFile } from 'fs/promises';
import type { PanelConfig } from '@srcpanel/common/Panel';
import Logger from '#/util/logger.js'
import Type from 'typebox';
import Schema from 'typebox/schema';
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

export const ConfigProvidersSchema = Type.Object({
  name: Type.String(),
  client_id: Type.String(),
  client_secret: Type.String(),
  token_url: Type.String(),
  revoke_url: Type.String(),
  user_url: Type.String(),
  authorize_url: Type.String(),
  avatar_url_format: Type.String()
})

export const ConfigSchema = Type.Object({ 
  general: Type.Object({
    listen: Type.Object({
      host: Type.String({ default: '0.0.0.0' }),
      port: Type.Integer({ exclusiveMinimum: 0, exclusiveMaximum: 65535, default: 8081 })
    }),
    public_url: Type.String({ format: "url" })
  }),
  links: Type.Optional(Type.Record(Type.String(), Type.String())),
  /** Link to github.com/jackzmc/l4d2-stats-plugin website, without /api prefix.  */
  stats_url: Type.Optional(Type.String({ format: "url" })),
  notice: Type.Optional(Type.Object({
    enabled: Type.Boolean(),
    text: Type.String(),
    class: Type.Optional(Type.String())
  })),
  providers: Type.Optional(Type.Record(Type.String(), ConfigProvidersSchema))
})


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
    const parsed = Schema.Parse(ConfigSchema, raw)

    const out: PanelConfig = {
      general: {
        listen: parsed.general.listen && {
          host: parsed.general.listen.host ?? '0.0.0.0',
          port: parsed.general.listen.port ?? 8081
        },
        public_url: parsed.general.public_url
      },
      links: parsed.links ?? {},
      stats_url: parsed.stats_url,
      notice: parsed.notice && {
        enabled: parsed.notice.enabled,
        text: parsed.notice.text,
        class: parsed.notice.class ?? ""
      },
      providers: parsed.providers ?? {}
    }
    return out
  }


  public async Reload() {
    try {
      const newConfig = await ConfigManager.#ParseFile(this.#filepath)
      this.#config = newConfig
    } catch (err: any) {
      log.error({ err}, "error reloading panel config")
    }
  }

  public get Config(): PanelConfig {
    return this.#config
  }

  public get PublicMeta(): PublicConfigMeta {
    return {
      notice: this.#config.notice,
      stats_url: this.#config.stats_url,
      domain: this.#config.general.public_url,
    }
  }

  public get Domain() {
    return this.#config.general.public_url
  }

  public get Providers() {
    return this.#config.providers
  }

  public GetProvider(key: string): PanelConfigProvider | null {
    return this.#config.providers[key] ?? null
  }
}
