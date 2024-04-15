import { PrivilegedUser, User } from '@/js/User.js'
import { defineStore } from 'pinia'

export const usePrivUserStore = defineStore('privUser', {
  state: () => ({ user: null } as { user: PrivilegedUser | null }),
  getters: {
    get: (state) => state.user,
  },
  actions: {
    async fetch() {

    }
  },
})
