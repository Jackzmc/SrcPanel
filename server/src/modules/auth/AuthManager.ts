import { Pool, RowDataPacket, OkPacket } from "mysql2/promise";
import QuickLRU from 'quick-lru'
import { FastifyReply, FastifyRequest } from 'fastify';
import ActivityLog from "../ActivityLog.js";
import { AdminData, AdminGroup, OauthProvider, SessionData, ReadableAdminGroup, UserNotification, UserNotificationOptions, AddUserNotification, UserProfileData, APIKey } from '@jzpanel/common/User';
import { ReadableAdminData, UserOauthProviders, OauthProviderData } from '@jzpanel/common/User';
import { SteamInfo, UserPrivilegeCode } from  '@jzpanel/common/Privileges';
import { SteamUserDetails } from '@jzpanel/common/Share';
import SteamID from "steamid";
import FastGeoip from 'fast-geoip';
import { SESSION_VERSION } from '../../routes/auth/steam.js';
import SteamAPI from "../steam.js";
import crypto from 'crypto'
import { minimatch } from 'minimatch'
import { OauthManager } from "./OauthManager.js";
import ConfigManager from "../ConfigManager.js";
import { OauthAuthData } from './OauthProvider.js';

import logger from '../../logger.js'
import CacheManager from "../../modules/CacheManager.js";
const log = logger.child({ name: "AuthManager" })

interface AddAdmin {
    authtype: "steam" | "name" | "ip",
    identity: string,
    flags?: string,
    password?: string | null,
    name: string,
    immunity: number,
    codes: (UserPrivilegeCode|string)[],
    groupIds?: string[]
}


export type NotificationCallback = (notification: UserNotification) => void


export default class AuthManager {
    #db: Pool //left4dead2-admins
    #dbna: Pool //left4dead2
    private admins: Record<string, AdminData> = {}
    private groups: Record<number, AdminGroup> = {}
    private apikeysCache: QuickLRU<string, APIKey>
    private actLog: ActivityLog
    private steam: SteamAPI
    #config: ConfigManager
    #cache: CacheManager
    // Caches the resolved name of a ban source such as discord:DISCORD_ID
    private providerNameCache: Map<string, string>

    #notificationSubscribers: Map<NotificationCallback, string> = new Map()

    #oauthManager: OauthManager

    constructor(adminDatabase: Pool, sessionDatabase: Pool, steam: SteamAPI, configManager: ConfigManager, cacheManager: CacheManager) {
        if(process.env.DEBUG_DISABLE_PERMISSION_SYSTEM) {
            log.warn("DEBUG_DISABLE_PERMISSION_SYSTEM set, permissions are ignored")
        }
        this.providerNameCache = new Map()
        this.apikeysCache = new QuickLRU<string, APIKey>({ 
            maxSize: 100, 
            maxAge: 1000 * 60 * 60 * 24 * 7 * 1 
        });
        this.#cache = cacheManager
        this.#db = adminDatabase
        this.#dbna = sessionDatabase
        this.steam = steam
        this.#config = configManager
        this.actLog = new ActivityLog(sessionDatabase)
        this.#oauthManager = new OauthManager(this, this.#config)
    }

    async #loadCache() {
        try {
            const json = await this.#cache.get<any>("auth.data")
            this.groups = json.groups
            this.admins = json.admins
            for(const admin of Object.values(this.admins)) {
                admin.permissions.codes = new Set(admin.permissions.codes)
            }
            log.info("Cache loaded successfully")
        } catch(err) {
            log.warn("failed to load cache: " + err)
        }
    }

    async #saveCache() {
        try {
            await this.#cache.set("auth.data", {
                timestamp_ms: Date.now,
                admins: this.admins,
                groups: this.groups
            })
        } catch(err) {
            log.warn(`Failed to save auth cache (${err.message})`)
        }
    }

    get AdminCount() {
        return Object.keys(this.admins).length
    }

    async Init() {
        // Load data from cache (possibly stale), but then load the fresh data in the background
        
        await this.#loadCache()
        // Don't block server starting when loading fresh data:
        this.FullRefresh()
    }

    async FullRefresh() {
        log.debug("Performing full refresh")
        let startTime = Date.now()
        await this.refreshGroups()
        const fetchGroupsTime = Date.now() - startTime

        startTime = Date.now()
        await this.refreshAdmins()
        const fetchAdminsTime = Date.now() - startTime

        log.info(`Fetched ${Object.keys(this.admins).length} admins in ${(fetchAdminsTime).toFixed(1)} ms`)
        log.info(`Fetched ${Object.keys(this.groups).length} groups in ${(fetchGroupsTime).toFixed(1)} ms`)
        await this.#saveCache()
    }

    get oauth() {
        return this.#oauthManager
    }

    getConnection() {
        return this.#db
    }

    get log() {
        return this.actLog
    }

    async isAuthorized(req: FastifyRequest): Promise<boolean> {
        return req.user != undefined
    }

    async verify(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
        const authorized = await this.isAuthorized(req)

        if(!authorized) {
            reply.code(401).send({
                error: 'UNAUTHORIZED',
                message: 'No user is authenticated or apikey is invalid',
                statusCode: 401
            })
        }

        req.session.lastActive = Math.floor(Date.now() / 1000)
    
        return authorized
    }
    
    public isAdmin(steamid2: string): boolean {
        return this.getAdmin(steamid2) != undefined
    }

    public getAdmin(steamid2: string): AdminData | undefined {
        if(!steamid2) throw new Error("steamid2 is not defined")
        return this.admins[steamid2.slice(10)]
    }

    public getAdminExport(steamid2: string): ReadableAdminData | null {
        if(!steamid2) throw new Error("steamid2 is not defined")
        const admin = this.admins[steamid2.slice(10)]
        if(!admin) return null
        return {
            id: admin.id,
            steamid: admin.identity,
            name: admin.name,
            groups: admin.groups.map(group => {
                return {
                    parentId: group.parentId,
                    id: group.id,
                    name: group.name,
                    codes: [...group.codes.values()],
                    immunity: group.immunity,
                    flags: group.flags,
                }
            }),
            permissions: {
                base: {
                    flags: admin.permissions.base.flags,
                    codes: [...admin.permissions.base.codes.values()],
                    immunityLevel: admin.permissions.base.immunityLevel,
                },
                flags: admin.permissions.flags,
                codes: [...admin.permissions.codes.values()],
                immunityLevel: admin.permissions.immunityLevel,
            },
        }
    }

    public getAdminById(id: number): AdminData | undefined {
        return Object.values(this.admins).find(admin => admin.id === id)
    }

    public async getPermissions(adminId: number): Promise<Set<UserPrivilegeCode>> {
        const [rows] = await this.#db.execute<RowDataPacket[]>(
            "SELECT code FROM dash_permissions WHERE admin_id = ?",
            [adminId]
        )
        return new Set(rows.map(row => row.code))
    }

    public async revokeAdmin(id: number) {
        const conn = await this.#db.getConnection()
        conn.beginTransaction()
        await conn.execute<OkPacket>("DELETE FROM sm_admins WHERE id = ?", [id])
        await conn.execute<OkPacket>("DELETE FROM sm_admins_groups WHERE admin_id = ?", [id])
        await conn.execute<OkPacket>("DELETE FROM dash_permissions WHERE admin_id = ?", [id])
        await conn.commit()
        conn.release()
        delete this.admins[id.toString()]
    }

    public async editAdmin(id: number, data: Partial<AddAdmin>) {
        const [rows] = await this.#db.execute<RowDataPacket[]>(`SELECT * FROM sm_admins WHERE id = ?`, [id])
        if(rows.length == 0) throw new Error("No admin with specified id exists")
        const newAdminData = rows[0]

        for(const key in data) {
            if(data[key]) {
                newAdminData[key] = data[key]
            }
        }
        const conn = await this.#db.getConnection()
        await conn.beginTransaction()
        await conn.query<OkPacket>(
            "UPDATE sm_admins SET flags = ?, name = ?, immunity = ?, password = ?, authtype = ? WHERE id = ?", 
            [newAdminData.flags, newAdminData.name, newAdminData.immunity, newAdminData.password, newAdminData.authtype, id]
        )

        // TODO: update permissions

        // If a change in groups
        if(data.groupIds) {
            // We don't know how many groups there are, easier to nuke them all and re-add
            await conn.query<OkPacket>(
                "DELETE FROM sm_admins_groups WHERE admin_id = ?", 
                [id]
            )
            for(const groupId of data.groupIds) {
                await conn.execute(
                    "INSERT INTO sm_admins_groups (admin_id, group_id, inherit_order) VALUES (?, ?, 0)",
                    [id, groupId]
                )
            }
        }

        await conn.commit()
        conn.release()

        // TODO: optimize this away
        await this.refreshAdmins()

        return {
            admin: newAdminData,
        }
    }

    public async addAdmin(admin: AddAdmin) {
        // TODO: Add group support
        if(admin.identity.length < 10) throw new Error("Invalid admin identity")
        const details = await this.steam.getUserDetails([new SteamID(admin.identity)])
        if(!details) throw new Error("Failed to get user details for " + admin.identity)
        try {
            await this.#dbna.execute("INSERT IGNORE INTO panel_user (account_id, avatar_hash) VALUES (?, ?, ?)", [admin.identity.slice(10), details[0].avatarhash])
            await this.#dbna.execute("INSERT INTO panel_user_names (account_id, name, name_update_time) VALUES (?, ?, UNIX_TIMESTAMP())", [admin.identity.slice(10), details[0].personaname])
        } catch(err) {
            log.warn(`Could not insert admin resolved name (${admin.identity.slice(10)}, name ${details[0].personaname}):`, err.sqlMessage)
        }

        const conn = await this.#db.getConnection()
        await conn.beginTransaction()
        const [ok] = await conn.execute<OkPacket>(
            `INSERT INTO sm_admins (\`authtype\`, \`identity\`, \`password\`, \`flags\`, \`name\`, \`immunity\`) VALUES (:authtype, :identity, :password, :flags, :name, :immunity)`,
            {
                authtype: admin.authtype || "steam",
                identity: admin.identity,
                password: admin.password || "",
                flags: admin.flags || "",
                name: admin.name || "",
                immunity: admin.immunity || 0,
            }
        )

        const id = ok.insertId

        if(admin.groupIds) {
            for(const groupId of admin.groupIds) {
                // Currently silently ignores if group does not exist. This should be changed.
                await conn.execute(
                    "INSERT INTO sm_admins_groups (admin_id, group_id, inherit_order) VALUES (?, ?, 0)",
                    [id, groupId]
                )
            }
        }

        await conn.commit()
        conn.release()

        // TODO: optimize this away
        await this.refreshAdmins()

        return id
    }

    /**
     * Gets the generated API key by its id from cache, or from database if exists
     * @param id the API key id
     * @returns 
     */
    public async getAPIKey(id: string): Promise<APIKey|null> {
        let apikey = this.apikeysCache.get(id)
        if(!apikey) {
            const [rows] = await this.#db.execute<RowDataPacket[]>(`SELECT * FROM dash_apikeys WHERE id = ?`, [id])
            if(rows.length == 0) return null
            apikey = {
                id: rows[0].id,
                steamid: rows[0].steamid,
                perms: rows[0].perms,
                created: rows[0].created,
                lastUsed: rows[0].lastUsed
            }
            this.apikeysCache.set(id, apikey)
        }
        return apikey
    }

    /**
     * Gets the generated API key, if exist, for a user
     * @param steamid steamid2
     * @returns 
     */
    public async getAPIKeyForUser(steamid: string): Promise<APIKey|null> {
        const [rows] = await this.#db.execute<RowDataPacket[]>(
            "SELECT * FROM dash_apikeys WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)",
            [ steamid ]
        )
        return rows.length > 0 ? {
            id: rows[0].id,
            steamid: rows[0].steamid,
            perms: rows[0].perms,
            created: rows[0].created,
            lastUsed: rows[0].lastUsed
         } : null
    }

    /**
     * (Re-)generates an API key for a user, deleting their old one if it exists.
     * @param steamid steamid2
     * @returns 
     */
    public async createApiKey(steamid: string): Promise<APIKey> {
        const conn = await this.#db.getConnection()
        await conn.beginTransaction()
        await conn.execute<OkPacket>(
            "DELETE FROM dash_apikeys WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)",
            [ steamid ]
        )

        const id = crypto.randomBytes(32).toString('hex')
        await conn.execute<OkPacket>(
            "INSERT INTO dash_apikeys (id, steamid, perms, created, lastUsed) VALUES (?, ?, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())",
            [ id, steamid ]
        )

        await conn.commit()
        conn.release()

        const created = Math.floor(Date.now() / 1000)
        return {
            id,
            steamid,
            created,
            lastUsed: created,
            perms: 0
        }
    }

    /**
     * Returns all notifications for a user
     * @param steamid2 steamid2
     * @returns 
     */
    public async getNotifications(steamid2: string): Promise<UserNotification[]> {
        const [rows] = await this.#db.execute<RowDataPacket[]>(
            "SELECT * FROM user_notifications WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)", 
            [steamid2]
        )
        return rows.map(row => {
            return {
                timestamp: row.timestamp,
                message: row.message,
                link: row.link,
                level: row.level
            } 
        })
    }

    subscribeNotifications(steamid2: string, callback: NotificationCallback) {
        this.#notificationSubscribers.set(callback, steamid2) 
    }
    unsubscribeNotifications(callback: NotificationCallback) {
        this.#notificationSubscribers.delete(callback)
    }
    #notifyNotificationSubscribers(steamid2: string, notification: UserNotification) {
        for(const [callback, steamid] of this.#notificationSubscribers.entries()) {
            if(steamid === steamid2) {
                callback(notification)
            }
        }
    }


    /**
     * Create a notification for a user
     *
     * @param {string} steamid2 admin's steamid
     * @param {string} message
     * @param {UserNotificationOptions} [options={}]
     * @memberof AuthManager
     */
    public async addNotification(steamid2: string, message: string, options: UserNotificationOptions = {}) {
        await this.#db.execute(
            "INSERT INTO user_notifications (steamid, message, link) VALUES (?, ?, ?)",
            [ steamid2, message, options.link ?? null ]
        )
        this.#notifyNotificationSubscribers(steamid2, {
            timestamp: Math.round(Date.now()/1000),
            message,
            link: options.link,
            level: options.level
        })
    }

    /**
     * Send bulk notifications, with the key being the steamid2 and value being notification data
     *
     * @param {Record<string, AddUserNotification>} notifications <steamid2, Notification>
     * @memberof AuthManager
     */
    public async addNotificationsBulk(notifications: Record<string, AddUserNotification>) {
        const conn = await this.#db.getConnection()
        await conn.beginTransaction()
        for(const [steamid2, notification] of Object.entries(notifications)) {
            await conn.execute(
                "INSERT INTO user_notifications (steamid, message, link) VALUES (?, ?, ?)",
                [ steamid2, notification.message, notification.link ?? null ]
            )
            this.#notifyNotificationSubscribers(steamid2, {
                timestamp: Math.round(Date.now()/1000),
                message: notification.message,
                link: notification.link,
                level: notification.level
            })
        }
        await conn.commit()
        conn.release()
    }

    /**
     * Sends a notification to all admins
     *
     * @param {string} message the message
     * @param {string?} [permission] The permission admin must have, or blank for none
     * @param {UserNotificationOptions} [options={}]
     * @memberof AuthManager
     */
    public async notifyAdmins(message: string, permission: string | null, options: UserNotificationOptions = {}) {
        // We manually call pool because we are sending many in bulk
        const conn = await this.#db.getConnection()
        await conn.beginTransaction()
        for(const admin of Object.values(this.admins)) {
            if(!permission || this.hasPermission(admin, permission)) {
                await conn.execute(
                    "INSERT INTO user_notifications (steamid, message, link) VALUES (?, ?, ?)",
                    [ admin.identity, message, options.link ?? null ]
                )
                this.#notifyNotificationSubscribers(admin.identity, {
                    timestamp: Math.round(Date.now()/1000),
                    message: message,
                    link: options.link,
                })
            }
        }
        await conn.commit()
        conn.release()
    }


    /**
     * Clears all notifications from a user
     *
     * @param {string} steamid2
     * @memberof AuthManager
     */
    public async clearNotifications(steamid2: string) {
        await this.#db.execute(
            "DELETE FROM user_notifications WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)",
            [ steamid2 ]
        )
    }

    /**
     * Fetches all game admin groups
     */
    public async refreshGroups() {
        const groups: Record<number, AdminGroup> = {}
        // Returns right join of sm_group_permissions, will return N permissions with group data for each one
        const [rows] = await this.#db.execute<RowDataPacket[]>("SELECT g.*, gp.code FROM sm_groups g LEFT JOIN sm_group_permissions gp ON g.id = gp.group_id")
        // Loop data adding the codes to each one
        for(const row of rows) {
            if(!groups[row.id]) {
                groups[row.id] = {
                    parentId: row.parent_id,
                    id: row.id,
                    codes: new Set(),
                    flags: row.flags,
                    name: row.name,
                    immunity: row.immunity_level,
                }
            }
            // May not have any base permissions
            if(row.code) {
                groups[row.id].codes.add(row.code)
            }
        }

        // Re-iterate, resolving group.parent
        for(const group of Object.values(groups)) {
            if(group.parentId) {
                const parent = groups[group.parentId]
                if(!parent) {
                    log.warn(`Group "${group.id}" has parent that does not exist (${group.parentId}), ignoring`)
                    continue
                }
                log.debug(`merging group ${parent.id} -> ${group.id}`)
                this._mergeGroup(parent, group)
            }
        }
        this.groups = groups
    }

    // Merge parent flags and codes onto group
    private _mergeGroup(parent: AdminGroup, group: AdminGroup) {
        if(group.immunity == 0) group.immunity = parent.immunity
        
        // This merges flags from parent and group (added to set, then converted back to string)
        group.flags = [...this._mergeToSet(parent.flags, group.flags)].join("")

        group.codes = this._mergeToSet(parent.codes, group.codes)
    }

    /**
     * Creates a new set that is the merge of child Set<T> onto parent Set<T>. The parent and child params are coverted to a set
     *
     * @private
     * @template T
     * @param {Iterable<T>} parent A set or array to merge into
     * @param {Iterable<T>} child A set or array to merge parent with
     * @return {Set<T>}  {Set<T>}
     * @memberof AuthManager
     */
    private _mergeToSet<T>(parent: Iterable<T>, child: Iterable<T>): Set<T> {
        const pSet = new Set<T>(parent)
        const cSet = new Set<T>(child)

        return new Set<T>([...pSet, ...cSet])
    }

    /**
     * Fetches the latest admin data from the table
     */
    public async refreshAdmins() {
        const [rows] = await this.#db.execute<RowDataPacket[]>(`
            SELECT a.*, sag.group_id as group_id, u.last_alias as resolvedName
            FROM sm_admins a
            LEFT JOIN sm_admins_groups sag on a.id = sag.admin_id
            LEFT JOIN \`left4dead2\`.stats_users u ON SUBSTRING(a.identity, 11) = SUBSTRING(u.steamid, 11)
        `)
        const admins: Record<string, AdminData> = {}
        for(const row of rows) {
            const accountId = row.identity.slice(10)
            // Create a new admin if we don't
            if(!admins[accountId]) {
                const base = {
                    immunityLevel: row.immunity,
                    flags: row.flags,
                    codes: new Set<UserPrivilegeCode>()
                }
                admins[accountId] = {
                    id: row.id,
                    authtype: row.authtype,
                    identity: row.identity,
                    password: row.password,
                    name: row.resolvedName ?? row.name,
                    permissions: {
                        ...base,
                        base
                    },
                    groups: []
                }
            }

            // Push the group for this row into the list, ignoring duplicates
            if(row.group_id && !admins[accountId].groups[row.group_id]) {
                const group = this.groups[row.group_id]
                if(!group) {
                    log.warn(`Admin "${row.id}" has group that does not exist (${row.group_id}), ignoring`)
                } else {
                    admins[accountId].groups.push(group)
                    // Resolve group permissions
                    this._applyGroup(group, admins[accountId])
                }
            }

        }


        // Now we finally resolve user permission overrides
        // This is the most time intensive as we are running a query per admin
        for(const admin of Object.values(admins)) {
            const permissions = await this.getPermissions(admin.id)
            for(const perm of permissions) {
                admin.permissions.codes.add(perm)
            }
        }
        this.admins = admins
    }

    private _applyGroup(group: AdminGroup, admin: AdminData) {
        if(group.immunity > admin.permissions.immunityLevel) admin.permissions.immunityLevel = group.immunity
        // This merges flags from group to admin (added to set, then converted back to string)
        admin.permissions.flags = [...this._mergeToSet(group.flags, admin.permissions.flags)].join("")

        admin.permissions.codes = this._mergeToSet(group.codes, admin.permissions.codes)
    }

    /**
     * Returns the resolved fetched admin data, returns an exportable (Set -> string[]) if not full admin
     * @param fullAdmin Return as-is admin data
     * @returns 
     */
    public getAdmins(fullAdmin: boolean = false) {
        if(fullAdmin) return Object.values(this.admins)
        else return Object.values(this.admins)
            .map(admin => {
                return this.getAdminExport(admin.identity)
            }) as ReadableAdminData[]
    }

    /**
     * List of all resolved admin groups
     */
    get Groups(): AdminGroup[] {
        return Object.values(this.groups)
    }

    get GroupsExport(): ReadableAdminGroup[] {
        return this.Groups
            .map(group => {
                return {
                    ...group,
                    codes: [...group.codes.values()]
                }
            })
    }

    public async getSessions(steamid: string): Promise<SessionData[]> {
        const [sessions] = await this.#dbna.execute<RowDataPacket[]>(`
            SELECT session_id AS id, JSON_UNQUOTE(JSON_EXTRACT(data,'$.ip')) as ip, JSON_UNQUOTE(JSON_EXTRACT(data, '$.countryCode')) as countryCode, CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.loginTime')) AS UNSIGNED) as loginTime, CAST((JSON_EXTRACT(data, '$.lastActive')) AS UNSIGNED) as lastActive
            FROM dash_sessions 
            WHERE SUBSTRING(JSON_UNQUOTE(JSON_EXTRACT(data, '$.user.steamid')), 11) = SUBSTRING(?, 11)`,
            [steamid]
        )
        return sessions as SessionData[]
    }

    /**
     * Returns a record of all providers for a user, with key being provider name, value being id for said provider .
     * Example of `{ discord: "#####" <-- discord account's id }`
     * @param steamid 
     * @returns Record<providerName, providerId>
     */
    public async getProviders(steamid: string): Promise<UserOauthProviders> {
        const [providers] = await this.#db.query<RowDataPacket[]>(
            "SELECT provider, provider_id, username, avatar_url FROM dash_providers WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)",
            [ steamid ]
        )
        const result: UserOauthProviders = {}
        for(const row of providers) {
            const data: OauthProviderData = {
                id: row.provider_id,
                username: row.username,
                avatarUrl: row.avatar_url
            }
            result[row.provider] = data
        }
        return result
    }

    
    /**
     * Sets or deletes a provider for a user
     * @param steamid steamid2
     * @param provider
     * @param providerData null to delete, otherwise provider oauth data
     * @param refreshToken The refresh token for the user's access
     * @returns 
     */
    public async setProvider(steamid: string, providerName: OauthProvider, providerData: OauthProviderData | null) {
        if(providerData === null) {
            // TOOD: also revoke token
            return await this.#db.query<OkPacket>(
                "DELETE FROM dash_providers WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11) AND provider = ?",
                [ steamid, providerName ]
            )
        } else {
            return await this.#db.query<OkPacket>(
                `INSERT INTO dash_providers (steamid, provider, provider_id, username, avatar_url) VALUES (?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE username = ?, avatar_url = ?`,
                [ steamid, providerName, providerData.id, providerData.username, providerData.avatarUrl, providerData.username, providerData.avatarUrl ]
            )
        }
    }

    /** 
     * Updates every provider for user, fetching the latest avatar, username from the provider.
     * @param steamid steamid2
     * @returns Record<providerName, OauthProviderData>
    */
    public async updateProviders(steamid: string): Promise<UserOauthProviders> {
        const providers = await this.getProviders(steamid)
        const result: UserOauthProviders = {}
        for(const providerName of Object.keys(providers)) {
            const provider = await this.oauth.getProvider(providerName)
            // Set the user, so we can fetch their access/refresh token
            if(!provider) continue
            await provider.setUser(steamid)
            if(provider.isExpired) {
                result[providerName] = null
            } else {
                try {
                    result[providerName] = await provider.fetchDetails()
                    // Don't need to pass in steamid again, it's already set by .setUser
                    await provider.save()
                } catch(err) {
                    result[providerName] = null
                }
            }
        }
        return result
    }

    public async fetchProviderAuthData(steamid: string, providerName: OauthProvider): Promise<OauthAuthData|null> {
        const [provider] = await this.#db.query<RowDataPacket[]>(
            "SELECT refresh_token, refresh_token_expired, access_token, access_token_expires FROM dash_providers WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11) AND provider = ?",
            [ steamid, providerName ]
        )
        if(!provider) return null
        return {
            refreshToken: provider[0].refresh_token,
            refreshTokenExpired: provider[0].refresh_token_expired,
            accessToken: provider[0].access_token,
            accessTokenExpires: provider[0].access_token_expires
        }
    }

    public async setProviderAuthData(steamid: string, providerName: OauthProvider, providerData: OauthAuthData) {
        return await this.#db.query<OkPacket>(
            "UPDATE dash_providers SET refresh_token = ?, refresh_token_expired = ?, access_token = ?, access_token_expires = ? WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11) AND provider = ?",
            [ providerData.refreshToken, providerData.refreshTokenExpired, providerData.accessToken, providerData.accessTokenExpires, steamid, providerName ]
        )
    }
    
    /**
     * Gets an admin user by a provider and the id for given provider 
     * @param provider the provider service
     * @param id id for provider service
     * @returns 
     */
    public async getAdminByProvider(provider: OauthProvider, id: string) {
        const [rows] = await this.#db.execute<RowDataPacket[]>(
            "SELECT steamid FROM dash_providers WHERE provider = ? and provider_id = ?", 
            [provider, id]
        )

        if(rows.length > 0) {
            return this.getAdminExport(rows[0].steamid)
        }
        return null
    }

    /**
     * Gets an admin name by a provider and the id for given provider 
     * @param provider the provider service
     * @param id id for provider service
     * @returns 
     */
    public async getNameFromProvider(provider: OauthProvider, providerId: string): Promise<string|null> {
        const cached = this.providerNameCache.get(`${provider}:${providerId}`)
        if(cached) return cached
        const [rows] = await this.#db.query<RowDataPacket[]>(
            "SELECT username FROM dash_providers WHERE provider_id = ? AND provider = ?",
            [ providerId, provider ]
        )
        if(rows.length === 0) return null
        this.providerNameCache.set(`${provider}:${providerId}`, rows[0].username)
        return rows[0].username
    }

    /**
     * Returns user's profile data, if it exists
     * @param steamid2 
     * @returns 
     */
    public async getProfileData(steamid2: string): Promise<UserProfileData|null> {
        const [rows] = await this.#db.query<RowDataPacket[]>("SELECT * FROM `left4dead2-admins`.panel_user_data WHERE steamid = ? LIMIT 1", [ steamid2 ])
        if(rows.length == 0) return null
        return {
            birthDate: rows[0].birth_date,
            birthMonth: rows[0].birth_month
        }
    }
    
    public async loginUser(req: FastifyRequest, reply: FastifyReply, admin: ReadableAdminData, steamDetails?: SteamUserDetails) {
        const steamInfo: SteamInfo = {
            steamid: admin.steamid,
            accountid: new SteamID(admin.steamid).accountid.toString(),
            name: steamDetails?.personaname ?? admin.steamid,
            profileurl: steamDetails?.profileurl,
            avatarhash: steamDetails?.avatarhash
        }
        req.session.user = steamInfo
        req.session.permissions = admin.permissions

        req.session.ip = req.ip
        req.session.countryCode = (await FastGeoip.lookup(req.ip))?.country
        req.session.loginTime = Math.round(Date.now() / 1000)
        req.session.lastActive = Math.round(Date.now() / 1000)
        req.session.version = SESSION_VERSION

        // reply.setCookie('srcds-sessdata', JSON.stringify({
        //     steamid: steamInfo.steamid,
        //     name: steamInfo.name,
        //     avatarhash: steamInfo.avatarhash
        // }))
    }

    public hasPermission(admin: AdminData, permission: string) {
        if(process.env.DEBUG_DISABLE_PERMISSION_SYSTEM) return true
        for(const perm of admin.permissions.codes) {
            if(AuthManager.isPermissionGranted(permission as UserPrivilegeCode, perm)) return true
        }
        return false
    }

    /**
     * Determines if 'code' has permission against 'matchCode'
     * @date 7/6/2023 - 10:52:10 AM
     *
     * @public
     * @static
     * @param {string} matchCode The permission to check access for 
     * @param {string} pattern The permission to check against matchCode
     */
    public static isPermissionGranted(matchCode: UserPrivilegeCode, pattern: string) {
        if(process.env.DEBUG_DISABLE_PERMISSION_SYSTEM) return true
        return minimatch(matchCode, pattern)
    }

}
