/*
TODO:
1. Revoke of tokens
2. Refreshing of access token automatically
    a. Refreshing of avatar on "Connections" page
*/

import { OauthProviderId, OauthProviderData } from "@srcpanel/common/User";
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
    refreshToken: string | null,
    refreshTokenExpired: boolean,
    accessToken: string | null
    accessTokenExpires: number | null,
}

// Buffer to pre-emptively refresh before this, to compensate for any latency
const EXPIRES_WINDOW_S = 100
export const USER_AGENT = 'SrcPanel(https://codeberg.com/jackzmc/srcpanel)'


// TODO: Add User-Agent: DiscordBot ($url, $versionNumber)
// TODO: use providers.<provider_name>
// TODO: fallback to providers/<provider>.png if non exist

export class TokenInvalid extends Error {
    constructor(message: string) {
        super(message)
    }
}

export class OauthProviderUser {
    #oauth: OauthConfig
    #providerName: string
    #steamid2: string
    #authData: OauthAuthData | null
    #userData: OauthProviderData | null
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

    async #fetchAccessToken(params: URLSearchParams) {
        const response = await fetch(this.#oauth.urls.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': USER_AGENT,
                'Authorization': this.#basicAuth
            },
            body: params
        })
        const responseType = response.headers.get("content-type")
        if(!responseType || !responseType.startsWith("application/json")) {
            const txt = await response.text()
            throw new Error("Invalid token exchange response: " + txt)
        }
        if(response.ok) {
            const json: AccessTokenResponse = await response.json()
            this.#authData = {
                refreshToken: json.refresh_token,
                refreshTokenExpired: false,
                accessToken: json.access_token,
                accessTokenExpires: Math.floor((Date.now()/1000) + json.expires_in), //convert to seconds
            }
            return json
        } else {
            const json = await response.json()
            // The token has expired or is not working, instaed of error return null so we can check:
            if(json.error === "invalid_grant" && !json.message) {
                // Set error here
                this.#authData = {
                    refreshToken: null,
                    refreshTokenExpired: true,
                    accessToken: null,
                    accessTokenExpires: null
                }
                throw new TokenInvalid(json.error_description)
            }
            throw new Error(`fetchAccessToken for provider ${this.#providerName}: ${JSON.stringify(json)} ${response.statusText}`)
        }
    }

    /** Acquires first access token by exchanging for it with OAuth2's code
    */
    async authorizeWithCode(code: string, redirectUrl: string) {
        if(!code) throw new Error('No code provided.');
        if(!redirectUrl) throw new Error("Oauth code was provided, but no redirect url was provided")
        const params = new URLSearchParams()
        params.append('grant_type', 'authorization_code')
        params.append('code', code)
        params.append('redirect_uri', redirectUrl)
        await this.#fetchAccessToken(params)
    }

    /** Acquires new access token by using refresh token. This does not check if the access key has expired, call getAccessToken */
    async #refreshAccessToken(refreshToken: string) {
        // if(!this.#authData) throw new Error("refreshAccessToken called with no auth data")
        if(!refreshToken) throw new Error("refreshAccessToken called with no refresh token")
        const params = new URLSearchParams()
        // params.append('client_id', this.#oauth.clientId)
        // params.append('client_secret', this.#oauth.clientSecret)
        params.append('grant_type', 'refresh_token')
        params.append('refresh_token', refreshToken)
        return await this.#fetchAccessToken(params)
    }

    get isExpired() {
        if(!this.#authData) return null
        return this.#authData.refreshTokenExpired
    }

    /** Returns an valid access token, refreshing if needed. Will error if there is no access token */
    async #getAccessToken() {
        if(!this.#authData) throw new Error("Provider has already been revoked, or not initialized")
        if(!this.#authData.accessToken || this.#authData.accessTokenExpires! >= ((Date.now() / 1000) + EXPIRES_WINDOW_S)) {
            if(!this.#authData.refreshToken) throw new Error("Missing refresh token, unable to acquire access token")
            await this.#refreshAccessToken(this.#authData.refreshToken)
        }
        if(!this.#authData.accessToken) {
            throw new Error("No valid access token available")
        }
        return this.#authData.accessToken
    }

    /** Initalizes a user by acquiring authentication data saved in auth manager */
    async setUser(steamid2: string) {
        this.#steamid2 = steamid2
        this.#authData = await this.#authManager.fetchProviderAuthData(steamid2, this.#providerName as OauthProviderId)
        // Attempt to request a token, to check if it expired
        await this.#getAccessToken()
    }

    /** Saves auth data for given user, if not provided will use previous used steamid */
    async save(steamid2?: string) {
        if(steamid2) this.#steamid2 = steamid2
        else if(!this.#steamid2) throw new Error("No steamid2 provided, fetch existing provider with .setUser(steamid) or call with one .save(steamid)")
        if(!this.#userData && this.#steamid2) {
            // No user data means .setUser was not called and .fetchDetails was not called
            throw new Error("No user data, either call .setUser() to get cached, or .fetchDetails to fetch")
        }
        await this.#authManager.setProvider(this.#steamid2, this.#providerName as OauthProviderId, this.#userData)
        await this.#authManager.setProviderAuthData(this.#steamid2, this.#providerName as OauthProviderId, this.#authData!)
    }

    /** 
        Fetches user's information from provider, using access token automatically. Must be called after .setUser or .authorizeWithCode 
        @param retry {boolean} - if request failed due to expired access token, acquire a new one and retry request
    */
    public async fetchDetails(retry: boolean = false): Promise<OauthProviderData|null> {
        const accessToken = await this.#getAccessToken()
        const userResponse = await fetch(this.#oauth.urls.detailsUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': USER_AGENT,
            }
        })
        if(userResponse.ok) {
            const user: UserData = await userResponse.json()
            
            let avatarUrl: string|undefined = undefined
            if(this.#oauth.config.avatarFormat) avatarUrl = this.#oauth.config.avatarFormat.replace("{id}", user.id).replace("{hash}", user.avatar)
            this.#userData = {
                // email: this.#data.email,
                id: user.id,
                username: user.username,
                avatarUrl
            }
            return this.#userData
        } else {
            // Our access token expired, retry again with a new token
            if(userResponse.status === 401) {
                if(retry) {
                    console.error(`[oauth/${this.#providerName}] ${await userResponse.text()}`)
                    throw new Error(`Could not authenticate with ${this.#providerName}`)
                }
                this.#authData!.accessToken = null
                return await this.fetchDetails(false) // do not retry loop
            }
            console.error(`[oauth/${this.#providerName}] ${await userResponse.text()}`)
            throw new Error(`fetchDetails for ${this.#providerName} returned error:`)
        }
    }

    public async revoke(): Promise<void> {
        if(!this.#authData) throw new Error("Provider has already been revoked")
        if(!this.#authData?.refreshToken) throw new Error("No refresh token available")
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
        await this.#authManager.setProvider(this.#steamid2, this.#providerName as OauthProviderId, null)
    }
}