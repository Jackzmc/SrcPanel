import { Connection, Pool, RowDataPacket, OkPacket } from "mysql2/promise";
import QuickLRU from 'quick-lru'
import { FastifyReply, FastifyRequest } from 'fastify';
import ActivityLog from "./ActivityLog.js";
import { AdminPermissions, AdminData, AdminGroup, WebRole, WebPermission, OauthProvider, SessionData } from '../../../common-types/User.js';
import { ReadableAdminData, UserOauthProviders, OauthProviderData } from '../../../common-types/User';
import { Service, ServicePrivilege, ServicePrivilegeKeys, SteamInfo, UserPrivileges } from  '../../../common-types/Privileges.js';
import { SteamUserDetails } from '../../../common-types/Share';
import SteamID from "steamid";
import FastGeoip from 'fast-geoip';
import { SESSION_VERSION } from '../routes/auth/steam.js';
import SteamAPI from "./steam.js";

interface AddAdmin {
    authtype: "steam" | "name" | "ip",
    identity: string,
    flags?: string,
    password?: string,
    name: string,
    immunity: number,
    privileges: Partial<Record<Service, ServicePrivilege>>
    groupIds?: string[]
}

interface APIKey {
    uuid: string,
    adminId: number,
    perms: number,
    created: number,
    lastUsed: number
}


export default class AuthManager {
    private db: Pool //left4dead2-admins
    private dbna: Pool //left4dead2
    private admins: Record<string, AdminData> = {}
    private groups: Record<number, AdminGroup> = {}
    private apikeysCache: QuickLRU<string, APIKey>
    private actLog: ActivityLog
    private steam: SteamAPI
    // Caches the resolved name of a ban source such as discord:DISCORD_ID
    private providerNameCache: Map<string, string>

    constructor(adminDatabase: Pool, sessionDatabase: Pool, steam: SteamAPI) {
        this.providerNameCache = new Map()
        this.apikeysCache = new QuickLRU<string, APIKey>({ maxSize: 100 });
        this.db = adminDatabase
        this.dbna = sessionDatabase
        this.steam = steam
        this.actLog = new ActivityLog(sessionDatabase)
        this.fetchAdmins()
    }

    getConnection() {
        return this.db
    }

    get log() {
        return this.actLog
    }

    async isAuthorized(req: FastifyRequest): Promise<boolean> {
        if(req.headers['x-apikey']) {
            const key = Array.isArray(req.headers['x-apikey']) ? req.headers['x-apikey'][0] : req.headers['x-apikey']
            const apikey = await this.getAPIKey(key)
            if(apikey) return true
        } else if(req.session.sessionId && req.session.permissions) {
            return true
        }

        return false
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

    hasPermission(req: FastifyRequest, permission: WebPermission): boolean {
        return (req.session.permissions.web.flags & permission) > 0
    }
    
    public isAdmin(steamid64: string) {
        return this.getAdmin(steamid64) != undefined
    }

    public getAdmin(steamid64: string) {
        if(!steamid64) throw new Error("steamid64 is not defined")
        return this.admins[steamid64.slice(10)]
    }

    public getAdminById(id: number) {
        return Object.values(this.admins).find(admin => admin.id === id)
    }

    public async getPrivileges(steamid64: string): Promise<UserPrivileges> {
        const [rows] = await this.db.execute<RowDataPacket[]>(
            "SELECT service, privilege FROM dash_privileges WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)",
            [steamid64]
        )
        let privs: UserPrivileges = {}
        for(const row of rows) {
            privs[row.service as Service] = row.privilege as ServicePrivilege
        }
        return privs
    }

    // If privilege is undefined, it will be ignored, if a privilege is null, it will be revoked
    public async setPrivileges(steamid64: string, privileges: UserPrivileges) {
        let user = this.getAdmin(steamid64)
        for(const [service, priv] of Object.entries(privileges)) {
            if(priv === null) {
                await this.db.execute(
                    "DELETE FROM dash_privileges WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11) AND service = ?",
                    [steamid64, service]
                )
            } else {
                await this.db.execute(
                    "INSERT INTO dash_privileges (steamid, service, privilege) VALUES(?, ?, ?) ON DUPLICATE KEY UPDATE privilege = ?",
                    [steamid64, service, priv, priv]
                )
            }
            user.permissions.base.privileges[service] = priv
        }
    }

    public async revokeAdmin(id: number) {
        await this.db.execute<OkPacket>("DELETE FROM sm_admins WHERE id = ?", [id])
        await this.db.execute<OkPacket>("DELETE FROM sm_admins_groups WHERE admin_id = ?", [id])
        // possibly make optional:
        const steamid = this.getAdminById(id)
        if(steamid)
            await this.db.execute<OkPacket>("DELETE FROM dash_perms WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)", [steamid])
            delete this.admins[id]
    }

    public async editAdmin(id: number, data: Partial<AddAdmin>, webPerms?: number) {
        const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT * FROM sm_admins WHERE id = ?`, [id])
        if(rows.length == 0) throw new Error("No admin with specified id exists")
        let newAdminData = rows[0]

        for(const key in data) {
            if(data[key]) {
                newAdminData[key] = data[key]
            }
        }
        await this.db.query<OkPacket>(
            "UPDATE sm_admins SET flags = ?, name = ?, immunity = ?, password = ?, authtype = ? WHERE id = ?", 
            [newAdminData.flags, newAdminData.name, newAdminData.immunity, newAdminData.password, newAdminData.authtype, id]
        )

        if(data.privileges) {
            await this.setPrivileges(rows[0].identity, data.privileges)
        }

        if(webPerms) {
            const [exists] = await this.db.execute<RowDataPacket[]>(
                "SELECT * FROM dash_perms WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)", 
                [rows[0].identity]
            )

            if(exists.length > 0) {
                await this.db.execute<OkPacket>(
                    `UPDATE dash_perms SET flags = ? WHERE steamid = ?`,
                    [webPerms, rows[0].identity]
                )
            } else {
                await this.db.execute<OkPacket>(
                    `INSERT INTO dash_perms (steamid, role, flags) VALUES (?, ${WebRole.ReadWrite}, ?)`,
                    [rows[0].identity, webPerms]
                )
            }
        }

        // If a change in groups
        if(data.groupIds) {
            // We don't know how many groups there are, easier to nuke them all and re-add
            await this.db.query<OkPacket>(
                "DELETE FROM sm_admins_groups WHERE admin_id = ?", 
                [id]
            )
            for(const groupId of data.groupIds) {
                await this.db.execute(
                    "INSERT INTO sm_admins_groups (admin_id, group_id, inherit_order) VALUES (?, ?, 0)",
                    [id, groupId]
                )
            }
        }

        await this.fetchAdmins()

        return {
            admin: newAdminData,
            webPerms
        }
    }

    public async addAdmin(admin: AddAdmin, webPermissions?: number, webFlags?: number) {
        // TODO: Add group support

        const details = await this.steam.getUserDetails([new SteamID(admin.identity)])
        try {
            await this.dbna.execute("INSERT INTO user_names (steamid, name, avatar_hash) VALUES (?, ?, ?)", [admin.identity.slice(10), details[0].personaname, details[0].avatarhash])
        } catch(err) {
            console.warn(`Warn: Could not insert admin resolved name (${admin.identity.slice(10)}, name ${details[0].personaname}):`, err.sqlMessage)
        }

        const [ok] = await this.db.execute<OkPacket>(
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

        if(webPermissions) {
            await this.db.execute(
                "INSERT INTO dash_perms (steamid, permissions, flags) VALUES (:steamid, :permissions, :flags)",
                {
                    steamid: admin.identity,
                    permissions: webPermissions,
                    flags: webFlags || 0

                }
            )
        }

        if(admin.privileges) {
            await this.setPrivileges(admin.identity, admin.privileges)
        }

        if(admin.groupIds) {
            for(const groupId of admin.groupIds) {
                // Currently silently ignores if group does not exist. This should be changed.
                await this.db.execute(
                    "INSERT INTO sm_admins_groups (admin_id, group_id, inherit_order) VALUES (?, ?, 0)",
                    [id, groupId]
                )
            }
        }

        // TODO: Refactor so full refresh not needed
        await this.fetchAdmins()

        return id
    }

    public async getAPIKey(uuid: string) {
        let apikey = this.apikeysCache.get(uuid)
        if(!apikey) {
            const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT * FROM dash_apikeys WHERE uuid = ?`, [uuid])
            if(rows.length == 0) return null
            apikey = {
                uuid: rows[0].uuid,
                adminId: rows[0].adminId,
                perms: rows[0].perms,
                created: rows[0].created,
                lastUsed: rows[0].lastUsed
            }
            this.apikeysCache.set(uuid, apikey)
        }
        return apikey
    }

    public async fetchAdmins() { 
        console.info("Fetching admins...")
        console.time("fetchAdmins")
        const admins: Record<string, AdminData> = {}, groups: Record<string, AdminGroup> = {}
        // TODO: Remove first LEFT JOIN stats_users, see #2
        const [rows] = await this.db.execute<RowDataPacket[]>(`
            SELECT sm_admins.*, sag.group_id as sg_id, sg.name as sg_name, sg.immunity_level as sg_immunity, sg.flags as sg_flags, left4dead2.stats_users.last_alias as name,
            dash.flags as web_flags, dash.role as web_role
            FROM sm_admins
            LEFT JOIN left4dead2.stats_users ON SUBSTRING(sm_admins.identity,11) = SUBSTRING(left4dead2.stats_users.steamid, 11)
            LEFT JOIN sm_admins_groups sag on sm_admins.id = sag.admin_id
            LEFT JOIN sm_groups sg on sg.id = sag.group_id
            LEFT JOIN dash_perms AS dash on SUBSTRING(dash.steamid,11) = SUBSTRING(sm_admins.identity,11)`
        )

        let lastId = null
        let highestImmunity = 0, flags = ''

        // Loops every admin. If an admin is more than one group, there will be multiple rows related to them
        for(const row of rows) {
            // Add initial set of flags and immunity
            const key = row.identity.slice(10)
            // Reset merge data on a new user
            if(lastId !== key) {
                highestImmunity = 0
                flags = ''
            }

            if(row.immunity > highestImmunity) highestImmunity = row.immunity
            for(const flag of row.flags) {
                if(!flags.includes(flag)) flags += flag
            }
            
            // Add the admin to the admin list
            if(!admins[key]) {
                const privileges = await this.getPrivileges(row.identity)
                admins[key] = {
                    id: row.id,
                    authtype: row.authtype,
                    identity: row.identity,
                    password: row.password,
                    name: row.name,
                    permissions: {
                        immunityLevel: highestImmunity,
                        flags,
                        privileges,
                        base: {
                            immunityLevel: row.immunity,
                            flags: row.flags,
                            privileges
                        },
                        web: {
                            role: row.web_role || 0,
                            flags: row.web_flags || 0
                        }
                    },
                    groups: []
                }
            }

            // If a group is set
            const groupId = row.sg_id?.toString()
            if(groupId) {
                // If group not cached, add it to list
                if(!groups[groupId]) {
                    groups[groupId] = {
                        id: groupId,
                        flags: row.sg_flags,
                        name: row.sg_name,
                        immunity: row.sg_immunity,
                        privileges: {}
                    }
                }

                const [privRows] = await this.db.execute<RowDataPacket[]>("SELECT service, privilege FROM sm_group_privileges WHERE group_id = ?", [ groupId])
                for(const privRow of privRows) {
                    groups[groupId].privileges[privRow.service] = privRow.privilege
                    // Set .permissions.privileges to be the highest of base + group
                    if(!admins[key].permissions.privileges[privRow.service] || privRow.privilege > admins[key].permissions.privileges[privRow.service]) {
                        admins[key].permissions.privileges[privRow.service] = privRow.privilege
                    }
                }

                admins[key].groups.push(groups[groupId])
                // Merge immunity & flags
                if(row.sg_immunity > highestImmunity) highestImmunity = row.sg_immunity
                for(const flag of row.sg_flags) {
                    if(!flags.includes(flag)) flags += flag
                }
            }

            admins[key].permissions.flags = flags
            admins[key].permissions.immunityLevel = highestImmunity
        }


        this.admins = admins
        this.groups = groups
        console.info(`Fetched ${Object.keys(admins).length} admins and ${Object.keys(groups).length} groups`)
        console.timeEnd("fetchAdmins")
    }

    public getAdmins(fullAdmin: boolean = false) {
        if(fullAdmin) return Object.values(this.admins)
        else return Object.values(this.admins)
            .map(admin => {
                return {
                    id: admin.id,
                    steamid: admin.identity,
                    name: admin.name,
                    permissions: admin.permissions,
                    groups: admin.groups
                }
            }) as ReadableAdminData[]
    }

    get Groups() {
        return Object.values(this.groups)
    }

    public async setProvider(steamid: string, provider: OauthProvider, providerData: OauthProviderData, refreshToken: string = null) {
        if(providerData === null) {
            return await this.db.query<OkPacket>(
                "DELETE FROM dash_providers WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11) AND provider = ?",
                [ steamid, provider ]
            )
        } else {
            return await this.db.query<OkPacket>(
                "INSERT INTO dash_providers (steamid, provider, provider_id, username, avatar_url, refresh_token) VALUES (?, ?, ?, ?, ?, ?)",
                [ steamid, provider, providerData.id, providerData.username, providerData.avatarUrl, refreshToken ]
            )
        }
    }

    public async getSessions(steamid: string): Promise<SessionData[]> {
        const [sessions] = await this.dbna.execute<RowDataPacket[]>(`
            SELECT session_id AS id, JSON_UNQUOTE(JSON_EXTRACT(data,'$.ip')) as ip, JSON_UNQUOTE(JSON_EXTRACT(data, '$.countryCode')) as countryCode, CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.loginTime')) AS UNSIGNED) as loginTime, CAST((JSON_EXTRACT(data, '$.lastActive')) AS UNSIGNED) as lastActive
            FROM dash_sessions 
            WHERE SUBSTRING(JSON_UNQUOTE(JSON_EXTRACT(data, '$.user.steamid')), 11) = SUBSTRING(?, 11)`,
            [steamid]
        )
        return sessions as SessionData[]
    }

    // Gets all providers with their id for that provider (discord: <discord_id>)
    public async getProviders(steamid: string): Promise<UserOauthProviders> {
        const [providers] = await this.db.query<RowDataPacket[]>(
            "SELECT provider, provider_id, username, avatar_url FROM dash_providers WHERE SUBSTRING(steamid, 11) = SUBSTRING(?, 11)",
            [ steamid ]
        )
        let result: UserOauthProviders = {}
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

    public async getAdminByProvider(provider: OauthProvider, id: string) {
        const [rows] = await this.db.execute<RowDataPacket[]>(
            "SELECT steamid FROM dash_providers WHERE provider = ? and provider_id = ?", 
            [provider, id]
        )

        if(rows.length > 0) {
            return this.getAdmin(rows[0].steamid)
        }
        return null
    }

    public async getNameFromProvider(provider: OauthProvider, providerId: string): Promise<string> {
        const cached = this.providerNameCache.get(`${provider}:${providerId}`)
        if(cached) return cached
        const [rows] = await this.db.query<RowDataPacket[]>(
            "SELECT username FROM dash_providers WHERE provider_id = ? AND provider = ?",
            [ providerId, provider ]
        )
        if(rows.length === 0) return null
        this.providerNameCache.set(`${provider}:${providerId}`, rows[0].username)
        return rows[0].username
    }
    
    public async loginUser(req: FastifyRequest, steamDetails: SteamUserDetails, admin: AdminData) {
        const steamInfo: SteamInfo = {
            steamid: admin.identity,
            accountid: new SteamID(admin.identity).accountid.toString(),
            name: steamDetails.personaname,
            profileurl: steamDetails.profileurl,
            avatarhash: steamDetails.avatarhash
        }
        req.session.user = steamInfo
        req.session.permissions = admin.permissions

        req.session.ip = req.ip
        req.session.countryCode = (await FastGeoip.lookup(req.ip))?.country
        req.session.loginTime = Math.round(Date.now() / 1000)
        req.session.lastActive = Math.round(Date.now() / 1000)
        req.session.version = SESSION_VERSION
    }

}