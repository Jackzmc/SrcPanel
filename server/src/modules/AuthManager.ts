import { Connection, Pool, RowDataPacket, OkPacket } from "mysql2/promise";
import QuickLRU from 'quick-lru'
import SteamID from 'steamid'
import { FastifyReply, FastifyRequest } from 'fastify';
import ActivityLog from "./ActivityLog.js";
import { AdminPermissions } from '../../../common-types/User';

interface AddAdmin {
    id?: number,
    authtype: "steam" | "name" | "ip",
    identity: string,
    flags?: string,
    password?: string,
    name: string,
    immunity: number,
    groupIds?: string[]
}

interface Admin {
    id?: number,
    authtype: "steam" | "name" | "ip",
    identity: string,
    password: string | null,
    name: string,

    permissions: AdminPermissions

    groups: Group[]
}

interface Group {
    id: number,
    flags: string,
    name: string,
    immunity: 0
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
    private admins: Record<string, Admin>
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

        this.admins[admin.identity] = {
            password: "",
            authtype: admin.authtype || "steam",
            ...admin,
            permissions: {
                immunityLevel: admin.immunity,
                web: {
                    role: webPermissions || 0,
                    flags: webFlags || 0
                }
            },
            groups: []
        }


        return ok.insertId
    }

    public isAdmin(steamid: SteamID) {
        return this.admins[steamid.getSteam2RenderedID(true)] !== null && this.admins[steamid.getSteam2RenderedID(true)] !== undefined
    }

    public getAdmin(steamid: SteamID) {
        return this.admins[steamid.accountid.toString()]
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
        const admins: Record<string, Admin> = {}, groups: Record<number, Group> = {}
        const [rows] = await this.connection.execute(`
            SELECT sm_admins.*, sag.group_id as sg_id, sg.name as sg_name, sg.immunity_level as sg_immunity, sg.flags as sg_flags, 
            dash.flags as web_flags, dash.role as web_role
            FROM sm_admins
            LEFT JOIN sm_admins_groups sag on sm_admins.id = sag.admin_id
            LEFT JOIN sm_groups sg on sg.id = sag.group_id
            LEFT JOIN dash_perms AS dash on dash.steamid = sm_admins.identity`
        )


        for(const row of rows as RowDataPacket[]) {
            if(!groups[row.sg_id]) {
                groups[row.sg_id] = {
                    id: row.sg_id,
                    flags: row.sg_flags,
                    name: row.sg_name,
                    immunity: row.sg_immunity
                }
            }

            const key = new SteamID(row.identity).accountid.toString()
            if(!admins[key]) {
                admins[key] = {
                    id: row.id,
                    authtype: row.authtype,
                    identity: row.identity,
                    password: row.password,
                    name: row.name,
                    permissions: {
                        immunityLevel: row.immunity,
                        flags: row.flags,
                        web: {
                            role: row.web_role || 0,
                            flags: row.web_flags || 0
                        }
                    },
                    groups: [groups[row.sg_id]]
                }
            } else { 
                admins[key].groups.push(groups[row.sg_id])
            }
        }

        this.admins = admins
    }

}