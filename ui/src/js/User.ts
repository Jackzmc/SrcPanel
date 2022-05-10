import { AdminData, WebPermission, WebRole } from '../../../common-types/User';
import type  { Session } from '../../../common-types/User';

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
  private data: Session

  constructor(session: Session) {
    if(!session) throw new Error("Session is empty")
    this.data = session
  }

  hasWebPerm(webPerm: WebPermission): boolean {
    if(this.data.permissions.web.flags & WebPermission.FullPermission) return true
    return (this.data.permissions.web.flags & webPerm) !== 0
  }

  get webRole(): WebRole {
    return this.data.permissions.web.role
  }

  get name() {
    return this.data.user.name
  }

  get id() {
    return this.data.user.steamid
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

}
