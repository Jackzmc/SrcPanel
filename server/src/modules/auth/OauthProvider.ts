/*
TODO:
1. Revoke of tokens
2. Refreshing of access token automatically
    a. Refreshing of avatar on "Connections" page
*/

import { OauthProvider, OauthProviderData } from "../../../../common-types/User.js";
import { OauthConfig } from "./OauthManager.js";
import AuthManager from "./AuthManager.js";

interface AccessTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

interface UserData {
    id: string,
    username: string,
    email: string,
    avatar: string
}

export interface OauthAuthData {
    refreshToken: string,
    refreshTokenExpired: boolean,
    accessToken: string
    accessTokenExpires: number,
}

// Buffer to pre-emptively refresh before this, to compensate for any latency
const EXPIRES_WINDOW_S = 100
const USER_AGENT = 'admin-panel (admin.jackz.me, v1)'


// TODO: Add User-Agent: DiscordBot ($url, $versionNumber)
// TODO: use providers.<provider_name>
// TODO: fallback to providers/<provider>.png if non exist

export class OauthProviderUser {
    #oauth: OauthConfig
    #providerName: string
    #steamid2: string
    #authData: OauthAuthData
    #userData: OauthProviderData
    #authManager: AuthManager

    constructor(providerName: string, oauthData: OauthConfig, authManager: AuthManager) {
        this.#providerName = providerName
        this.#oauth = oauthData
        this.#authManager = authManager
    }

    get #basicAuth() {
        const raw = Buffer.from(`${this.#oauth.clientId}:${this.#oauth.clientSecret}`).toString('base64')
        return `Basic ${raw}`
    }

    async #fetchAccessToken(code?: string, redirectUrl?: string) {
        if(!code && !this.#authData.refreshToken) throw new Error('No code or refresh token provided. Either call .authorize(code) or .setUser(steamid) first')
        const params = new URLSearchParams()
        // params.append('client_id', this.#oauth.clientId)
        // params.append('client_secret', this.#oauth.clientSecret)
        params.append('grant_type', code ? 'authorization_code' : 'refresh_token')
        if(code) {
            params.append('code', code)
            if(!redirectUrl) throw new Error("Oauth code was provided, but no redirect url was provided")
            params.append('redirect_uri', redirectUrl)
        }
        else if(this.#authData.refreshToken) params.append('refresh_token', this.#authData.refreshToken)
        console.log(params, this.#basicAuth)
        const response = await fetch(this.#oauth.urls.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': USER_AGENT,
                'Authorization': this.#basicAuth
            },
            body: params
        })
        if(response.ok) {
            const json: AccessTokenResponse = await response.json()
            console.log(json)
            this.#authData = {
                refreshToken: json.refresh_token,
                refreshTokenExpired: false,
                accessToken: json.access_token,
                accessTokenExpires: Date.now() + (json.expires_in*1000), //convert json.expires_in from sec to milliseconds
            }
            return json
        } else {
            const json = await response.json()
            if(json.error === "invalid_grant") {
                // Set error here
                this.#authData = {
                    refreshToken: null,
                    refreshTokenExpired: true,
                    accessToken: null,
                    accessTokenExpires: null
                }
                return null
            }
            throw new Error(`fetchAccessToken for provider ${this.#providerName}: ${JSON.stringify(json)} ${response.statusText}`)
        }
    }

    get isExpired() {
        if(!this.#authData) return null
        return this.#authData.refreshTokenExpired
    }

    async #getAccessToken() {
        if(!this.#authData.accessToken || this.#authData.accessTokenExpires >= (Date.now() + EXPIRES_WINDOW_S)) {
            await this.#fetchAccessToken()
        }
        return this.#authData.accessToken
    }

    async authorize(code: string) {
        return await this.#fetchAccessToken(code, this.#oauth.urls.redirectUrl)
    }

    async setUser(steamid2: string) {
        this.#steamid2 = steamid2
        this.#authData = await this.#authManager.fetchProviderAuthData(steamid2, this.#providerName as OauthProvider)
        // Attempt to request a token, to check if it expired
        await this.#getAccessToken()
    }

    async save(steamid2?: string) {
        if(steamid2) this.#steamid2 = steamid2
        else if(!this.#steamid2) throw new Error("No steamid2 provided, fetch existing provider with .setUser(steamid) or call with one .save(steamid)")
        if(!this.#userData && this.#steamid2) {
            // No user data means .setUser was not called and .fetchDetails was not called
            throw new Error("No user data, either call .setUser() to get cached, or .fetchDetails to fetch")
        }
        await this.#authManager.setProviderAuthData(this.#steamid2, this.#providerName as OauthProvider, this.#authData)
    }

    public async fetchDetails(): Promise<OauthProviderData> {
        const accessToken = await this.#getAccessToken()
        if(!accessToken) return null
        console.log('token', accessToken)
        const userResponse = await fetch(this.#oauth.urls.detailsUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': USER_AGENT,
            }
        })
        if(userResponse.ok) {
            const user: UserData = await userResponse.json()
            
            let avatarUrl: string
            if(this.#oauth.config.avatarFormat) avatarUrl = this.#oauth.config.avatarFormat.replace("{id}", user.id).replace("{hash}", user.avatar)
            this.#userData = {
                // email: this.#data.email,
                id: user.id,
                username: user.username,
                avatarUrl
            }
            await this.#authManager.setProvider(this.#steamid2, this.#providerName as OauthProvider, this.#userData)
            
            return this.#userData
        } else {
            throw new Error(`fetchDetails for ${this.#providerName} returned error: `, await userResponse.json())
        }
    }

    public async revoke(): Promise<void> {
        const params = new URLSearchParams()
        params.append('token', this.#authData.refreshToken)
        params.append('token_type_hint', "refresh_token")
        await fetch(this.#oauth.urls.revokeUrl, {
            method: "POST",
            headers: {
                Authorization: this.#basicAuth
            },
            body: params
        })
        this.#authData = null
        this.#userData = null
        await this.#authManager.setProvider(this.#steamid2, this.#providerName as OauthProvider, null)
    }
}