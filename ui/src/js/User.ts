import { AdminData, SessionUser, WebPermission, WebRole, AdminPermissions } from '../../../common-types/User';
import type  { UserData } from '../../../common-types/User';
import { UserPrivileges, ActionRequiredPrivilege, ServicePrivilege, Service, Action, ServiceSupportedActions, ServicePrivilegeKeys, UserPrivilegeCode } from '../../../common-types/Privileges';
import { minimatch } from 'minimatch'

export interface PlayerData {
  isAdmin: boolean,
  steamid: string,
  name: string,
  country: string,
  lastJoinDate: number
  firstJoinDate: number,
  bansCount: number,
  notesCount: number
}
export interface PlayerResponse {
  user: PlayerData,
  adminData?: AdminData
}


export function convertBitsArrayToInt(bits: number[]) {
  return bits.reduce((pv, cv) => pv + Number(cv), 0)
}

export function convertIntToBitsArray(number: number, maxBitValue: number = 64) {
  const flags = []
  let i = 0
  while(true) {
    const power = 1 << i
    if(power > maxBitValue) break
    if(number & power) flags.push(power)
    i++
  }
  return flags
}

export class User {
  static async fetch(id: string, includeAdminData = false): Promise<PlayerResponse|null> {
    const response = await fetch(`/api/users/${id}?include=${includeAdminData?'admin':''}`)
    if(response.ok) {
      const json = await response.json()
      if(json.user) {
        return {
          user: json.user,
          adminData: json.adminData
        }
      } else {
        console.error('No users were found for id?')
        return null
      }
    }
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
  }

  static async getStats(id: string) {
    const response = await fetch(`https://stats.jackz.me/api/user/${id}`)
    if(response.ok) {
      const json = await response.json()
      if(json.user) {
        return json.user as Record<string, string|number>
      } else {
        console.error('No stats found for user')
        return null
      }
    }
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
  }
}

export class PrivilegedUser {
  private data: UserData<Set<UserPrivilegeCode>>

  constructor(session: UserData<UserPrivilegeCode[]>) {
    if(!session) throw new Error("Session is empty")
    console.log('what the fuck')
    console.log({...session})
    // @ts-expect-error We store it temp as [] then immediately correct and change to set:
    this.data = session
    if(Array.isArray(this.data.permissions.codes)) this.data.permissions.codes = new Set(session.permissions.codes)
    else this.data.permissions.codes = new Set()
  }

  equals(id: string) {
    return this.id.substring(10) === id.substring(10)
  }

  /** @deprecated */
  hasWebPerm(webPerm: WebPermission): boolean {
    return false
  }

  hasPermission(code: UserPrivilegeCode, ...resourceIds: (string | number | undefined)[]) {
    // TODO: Make sure user for 'servers.configs.read' has access to 'servers.configs'? idk verify
    let permCode: string = code
    for(const resource of resourceIds) {
      if(resource != undefined)
        permCode += `.${resource}`
    }
    for(const pattern of this.permissions.codes) {
        if(minimatch(code, pattern)) return true
    }
    return false
}

  hasFlag(flag: string, ignoreRoot: boolean = false) : boolean {
    const flags = this.flags
    return (!ignoreRoot && flags.includes("z")) || flags.includes(flag)
  }

  /** @deprecated */
  hasPrivilege(service: Service, privilege: ServicePrivilege) : boolean {
    if(!ServiceSupportedActions[service].includes(privilege)) console.warn(`[Privileges] <User>.hasPrivilege() called on service ${service} with invalid privilege (service does not support ${ServicePrivilegeKeys[privilege]})`)
    return true
    return this.privileges[service] as number >= privilege
  }

  /** @deprecated */
  getPrivilege(service: Service): ServicePrivilege | null {
    return this.privileges[service] ?? null
  }
  /** @deprecated */
  getPrivilegeById(service: string): ServicePrivilege | null {
    return this.privileges[service as Service] ?? null
  }

  /** @deprecated */
  canPerformAction(service: Service, action: Action, userSteamid?: string) : boolean {
    let hasPerm = this.hasPrivilege(service, ActionRequiredPrivilege[action])
    // Check if they have manage permission
    if(userSteamid && userSteamid !== this.id) {
      hasPerm = hasPerm && this.hasPrivilege(service, ServicePrivilege.Manage)
      // console.debug(`[permcheck] ${service}.${action}: ${hasPerm} | user: ${userSteamid}`)
      return hasPerm
    }
    // console.debug(`[permcheck] ${service}.${action}: ${hasPerm}`)
    return hasPerm
  }

  /** @deprecated */
  get webRole(): WebRole {
    return WebRole.None
  }

  /** @deprecated */
  get privileges(): UserPrivileges {
    return this.permissions.privileges ?? {}
  }

  get name() {
    return this.data.user.name
  }

  get id() {
    return this.data.user.steamid
  }

  get codes() {
    return this.data.permissions.codes
  }

  get permissions() {
    return this.data.permissions
  }

  get flags() {
    return this.data.permissions.flags || ''
  }

  get immunityLevel() {
    return this.data.permissions.immunityLevel
  }

  get base() {
    return this.data.permissions.base
  }

  get avatarUrl() {
    return `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/79/${this.data.user.avatarhash}.jpg`
  }

}
