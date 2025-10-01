import User from "../users/User.js";
import { OauthProvider } from "../../../../common-types/User.js";
import { OauthProviderUser } from './OauthProvider.js';
import AuthManager from "./AuthManager.js";
import ConfigManager, { RegisteredProvider } from "../ConfigManager.js";
import assert from "node:assert";

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
    config: ProviderConfig
}

export interface ProviderConfig {
    avatarFormat: string | null
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
        return Object.entries(this.#config.Providers)
            .map(([id, data]) => {
                return {
                    id,
                    ...data
                }
            })
    }

    /**
     * Returns an instance of a provider for a user. Can be used to automatically make API calls against provider, such as fetching user details and revoking.
     * @param providerName the provider id
     * @returns Promise<OauthProviderUser> - instance of OauthProviderUser
     */
    async getProvider(providerName: string): Promise<OauthProviderUser|null> {
        const domain = this.#config.Domain
        const provider = this.#config.GetProvider(providerName)
        assert(provider != null)
        // Assume not null
        const urls = {
            tokenUrl: provider.token_url,
            revokeUrl: provider.revoke_url,
            detailsUrl: provider.user_url,
            redirectUrl: `${domain}/api/auth/${providerName}/callback`
        }
        
        const oauthConfig: OauthConfig = {
            clientId: provider.client_id,
            clientSecret: provider.client_secret,
            urls,
            config: {
                avatarFormat: provider.avatar_url_format ?? null
            }
        }
        return new OauthProviderUser(providerName, oauthConfig, this.#authmngr)
    }
}