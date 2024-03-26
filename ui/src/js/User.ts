import { AdminData} from '../../../common-types/User';
import type  { UserData, ClientUserData, OauthProviderData } from '../../../common-types/User';
import { UserPrivilegeCode } from '../../../common-types/Privileges';
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
  private data: ClientUserData
  private webCodes: Set<UserPrivilegeCode> = new Set()

  constructor(session: UserData<UserPrivilegeCode[]>) {
    if(!session) throw new Error("Session is empty")
    this.data = session
    if(Array.isArray(session.permissions.codes))
      this.webCodes = new Set(session.permissions.codes)
  }

  equals(id: string) {
    return this.id.substring(10) === id.substring(10)
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

  updateProviders(providers: Record<string, OauthProviderData>) {
    this.data.providers = providers
  }

  hasFlag(flag: string, ignoreRoot: boolean = false) : boolean {
    const flags = this.flags
    return (!ignoreRoot && flags.includes("z")) || flags.includes(flag)
  }

  get isImpersonating() {
    return this.data.impersonatingId
  }

  /**
   * Returns the steamid of the user that is being impersonated
   *
   * @readonly
   */
  get ImpersonatingSteamId() {
    return this.data.impersonatingId
  }

  get openDiscussionCount() {
    return this.data.openDiscussions
  }

  get name() {
    return this.data.user.name
  }

  get id() {
    return this.data.user.steamid
  }

  get codes(): UserPrivilegeCode[] {
    return [...this.webCodes.values()]
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

  get notifications() {
    return this.data.notifications ?? []
  }

  async clearNotifications() {
    const res = await fetch(`/api/auth/notifications`, {
      method: "DELETE"
    })
    if(res.ok)
      this.data.notifications = []
    else
      return null
  }

  get isSessionOld() {
    return this.data.isSessionOld
  }

  get providers() {
    return this.data.providers ?? {}
  }
}
