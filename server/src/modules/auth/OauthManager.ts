import User from "../users/User.js";
import { OauthProvider } from "../../../../common-types/User.js";
import { OauthProviderUser } from './OauthProvider.js';
import AuthManager from "./AuthManager.js";
import ConfigManager, { RegisteredProvider } from "../ConfigManager.js";

export interface OauthConfig {
    clientId: string,
    clientSecret: string,

    urls: {
        // authorizeUrl: string,
        tokenUrl: string,
        revokeUrl: string,
        detailsUrl: string,
        redirectUrl?: string
    },
    config?: ProviderConfig
}

export interface ProviderConfig {
    avatarFormat: string
}

export class OauthManager {
    #authmngr: AuthManager
    #config: ConfigManager

    constructor(authManager: AuthManager, configManager: ConfigManager) {
        this.#authmngr = authManager
        this.#config = configManager
    }
    
    /**
     * Returns an array of registered provider ids and names
     * @returns Promise<RegisteredProvider>
     */
    async getProviders(): Promise<RegisteredProvider[]> {
        return await this.#config.FindProviders()
    }

    /**
     * Returns an instance of a provider for a user. Can be used to automatically make API calls against provider, such as fetching user details and revoking.
     * @param providerName the provider id
     * @returns Promise<OauthProviderUser> - instance of OauthProviderUser
     */
    async getProvider(providerName: string): Promise<OauthProviderUser> {
        const domain = await this.#config.GetKVNamespaced("domain")
        const clientId = await this.#config.GetKVNamespaced("providers", providerName, "clientId")
        const clientSecret = await this.#config.GetKVNamespaced("providers", providerName, "clientSecret")
        if(!clientId || !clientSecret) {
            return null
        }
        const urls = {
            tokenUrl: await this.#config.GetKVNamespaced("providers", providerName, "token_url"),
            revokeUrl: await this.#config.GetKVNamespaced("providers", providerName, "revoke_url"),
            detailsUrl: await this.#config.GetKVNamespaced("providers", providerName, "user_url"),
            redirectUrl: `${domain}/api/auth/${providerName}/callback`
        }
        
        const oauthConfig: OauthConfig = {
            clientId,
            clientSecret,
            urls,
            config: {
                avatarFormat: await this.#config.GetKVNamespaced("providers", providerName, "avatar_url_format")
            }
        }
        return new OauthProviderUser(providerName, oauthConfig, this.#authmngr)
    }
}