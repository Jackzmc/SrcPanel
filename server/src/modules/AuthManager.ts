import { Connection, Pool, RowDataPacket, OkPacket } from "mysql2/promise";
import QuickLRU from 'quick-lru'
import SteamID from 'steamid'
import { FastifyReply, FastifyRequest } from 'fastify';
import ActivityLog from "./ActivityLog.js";
import { AdminPermissions, AdminData, AdminGroup, WebRole } from '../../../common-types/User.js';
import { ReadableAdminData } from '../../../common-types/User';

interface AddAdmin {
    authtype: "steam" | "name" | "ip",
    identity: string,
    flags?: string,
    password?: string,
    name: string,
    immunity: number,
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
    private connection: Connection
    private admins: Record<string, AdminData> = {}
    private groups: Record<number, AdminGroup> = {}
    private apikeysCache: QuickLRU<string, APIKey>
    private actLog: ActivityLog

    constructor(connection: Connection, pool: Pool) {
        this.apikeysCache = new QuickLRU<string, APIKey>({ maxSize: 100 });
        this.connection = connection
        this.actLog = new ActivityLog(pool)
        this.fetchAdmins()
    }

    getConnection() {
        return this.connection
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
    
        return authorized
    }
    
    public isAdmin(steamid: SteamID) {
        const id = steamid.accountid.toString()
        return this.admins[id] !== null && this.admins[id] !== undefined
    }

    public getAdmin(steamid: SteamID) {
        return this.admins[steamid.accountid.toString()]
    }

    public getAdminById(id: number) {
        for(const steamid in this.admins) {
            if(this.admins[steamid].id === id) return this.admins[steamid]
        }
        return null
    }

    public async revokeAdmin(id: number) {
        await this.connection.execute<OkPacket>("DELETE FROM sm_admins WHERE id = ?", [id])
        await this.connection.execute<OkPacket>("DELETE FROM sm_admins_groups WHERE admin_id = ?", [id])
        // possibly make optional:
        const steamid = this.getAdminById(id)
        if(steamid)
            await this.connection.execute<OkPacket>("DELETE FROM dash_perms WHERE steamid = ?", [steamid])
    }

    public async editAdmin(id: number, data: Partial<AddAdmin>, webPerms?: number) {
        const [rows] = await this.connection.execute<RowDataPacket[]>(`SELECT * FROM sm_admins WHERE id = ?`, [id])
        if(rows.length == 0) throw new Error("No admin with specified id exists")
        let newAdminData = rows[0]

        for(const key in data) {
            if(data[key]) {
                newAdminData[key] = data[key]
            }
        }
        await this.connection.query<OkPacket>(
            "UPDATE sm_admins SET flags = ?, name = ?, immunity = ?, password = ?, authtype = ? WHERE id = ?", 
            [newAdminData.flags, newAdminData.name, newAdminData.immunity, newAdminData.password, newAdminData.authtype, id]
        )

        if(webPerms) {
            const [exists] = await this.connection.execute<RowDataPacket[]>(
                "SELECT * FROM dash_perms WHERE steamid = ?", 
                [rows[0].identity]
            )

            if(exists.length > 0) {
                await this.connection.execute<OkPacket>(
                    `UPDATE dash_perms SET flags = ? WHERE steamid = ?`,
                    [webPerms, rows[0].identity]
                )
            } else {
                await this.connection.execute<OkPacket>(
                    `INSERT INTO dash_perms (steamid, role, flags) VALUES (?, ${WebRole.ReadWrite}, ?)`,
                    [rows[0].identity, webPerms]
                )
            }
        }

        // If a change in groups
        if(data.groupIds) {
            // We don't know how many groups there are, easier to nuke them all and re-add
            await this.connection.query<OkPacket>(
                "DELETE FROM sm_admins_groups WHERE admin_id = ?", 
                [id]
            )
            for(const groupId of data.groupIds) {
                await this.connection.execute(
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

        const [ok] = await this.connection.execute<OkPacket>(
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
            await this.connection.execute(
                "INSERT INTO dash_perms (steamid, permissions, flags) VALUES (:steamid, :permissions, :flags)",
                {
                    steamid: admin.identity,
                    permissions: webPermissions,
                    flags: webFlags || 0

                }
            )
        }

        if(admin.groupIds) {
            for(const groupId of admin.groupIds) {
                // Currently silently ignores if group does not exist. This should be changed.
                await this.connection.execute(
                    "INSERT INTO sm_admins_groups (admin_id, group_id, inherit_order) VALUES (:admin_id, :group_id, 0)",
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
            const [rows] = await this.connection.execute<RowDataPacket[]>(`SELECT * FROM dash_apikeys WHERE uuid = ?`, [uuid])
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
        const admins: Record<string, AdminData> = {}, groups: Record<string, AdminGroup> = {}
        // TODO: Remove first LEFT JOIN stats_users, see #2
        const [rows] = await this.connection.execute(`
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
        for(const row of rows as RowDataPacket[]) {
            // Add initial set of flags and immunity
            const key = new SteamID(row.identity).accountid.toString()
            // Reset merge data on a new user
            if(lastId !== key) {
                highestImmunity = 0
                flags = ''
            }

            if(row.immunity > highestImmunity) highestImmunity = row.immunity
            if(flags === '') { // Only run on first row
                for(const flag of row.flags) {
                    if(!flags.includes(flag)) flags += flag
                }
            }
            
            // Add the admin to the admin list
            if(!admins[key]) {
                admins[key] = {
                    id: row.id,
                    authtype: row.authtype,
                    identity: row.identity,
                    password: row.password,
                    name: row.name,
                    permissions: {
                        immunityLevel: highestImmunity,
                        flags,
                        base: {
                            immunityLevel: row.immunity,
                            flags: row.flags
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
                        immunity: row.sg_immunity
                    }
                }
                admins[key].groups.push(groups[groupId])
                // Merge immunity & flags
                if(row.sg_immunity > highestImmunity) highestImmunity = row.sg_immunity
                for(const flag of row.sg_flags) {
                    if(!flags.includes(flag)) flags += flag
                }
            }
        }

        this.admins = admins
        this.groups = groups
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

}