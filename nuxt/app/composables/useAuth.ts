import type { ClientUserData } from '../../../common-types/User'

export function useAuth() {
  // useState key is shared across SSR → client hydration
  const user = useState<ClientUserData | null>('auth.user', () => null)
  const privUser = user

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

  /**
   * Requires user to be logged in. If not redirects to login page (that will redirect back when logged in)
   */
  async function requireAuth() {
    if (!isLoggedIn.value) {
      const route = useRoute()
      await navigateTo('/login?return_to=' + encodeURIComponent(route.path))
    }
  }

  const isLoggedIn = computed(() => user.value !== null)

  return { user, privUser, isLoggedIn, fetchUser, logout, requireAuth }
}
