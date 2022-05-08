import { WebPermission, WebRole } from '../../../common-types/User';
import type  { Session } from '../../../common-types/User';

export interface PlayerData {
  isAdmin: boolean,
  steamid: string,
  name: string,
  country: string,
  lastJoinDate: number
  firstJoinDate: number
}

export class User {
  static async fetch(id: string): Promise<PlayerData|null> {
    const response = await fetch(`/api/users/${id}`)
    if(response.ok) {
      const json = await response.json()
      if(json.user) {
        return json.user
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
    return this.data.permissions.flags
  }

  get immunityLevel() {
    return this.data.permissions.immunityLevel
  }

}
