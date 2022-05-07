import { Session, WebPermission, WebRole } from '../../../common-types/User';
export default class User {
  private data: Session

  static async fetch(id: string) {
    const response = await fetch(`/api/users/${id}`)
    if(response.ok) {
      const json = await response.json()
      if(json.user) {
        return new User(json.user)
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

  async getStats() {
    return User.getStats(this.data.user.steamid)
  }

  constructor(session: Session) {
    this.data = session
  }

  hasWebPerm(webPerm: WebPermission): boolean {
    return (this.data.permissions.web.flags & webPerm) !== 0
  }

  get webRole(): WebRole {
    return this.data.permissions.web.role
  }

}
