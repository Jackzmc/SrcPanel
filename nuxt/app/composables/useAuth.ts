import type { ClientUserData } from '../../../common-types/User'

export function useAuth() {
  // useState key is shared across SSR → client hydration
  const user = useState<ClientUserData | null>('auth.user', () => null)

  async function fetchUser() {
    try {
      user.value = await useApi()<ClientUserData>('/auth/profile')
    } catch {
      user.value = null
    }
  }

  async function logout() {
    await useApi()('/auth/logout')
    user.value = null
    await navigateTo('/login')
  }

  const isLoggedIn = computed(() => user.value !== null)

  return { user, isLoggedIn, fetchUser, logout }
}
