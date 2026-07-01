import type { UserPrivilegeCode } from "@srcpanel/common/Privileges";
import type { ClientUserData } from "@srcpanel/common/User";

export function useAuth() {
  // useState key is shared across SSR → client hydration
  const user = useState<ClientUserData | null>("auth.user", () => null);
  const privUser = user;

  async function fetchUser() {
    try {
      // Reduce timeout on SSR to keep it responsive if server unavailable
      user.value = await useApi()<ClientUserData>("/auth/profile", { timeout: import.meta.server ? 1000 : 8000,  });
    } catch (err: any) {
      if(err.status === 401) {
        user.value = null;
      } else { 
        console.error("profile fetch error", err);
      }
    }
  }

  async function logout() {
    await useApi()("/auth/logout");
    user.value = null;
    await navigateTo("/login");
  }

  /**
   * Requires user to be logged in. If not redirects to login page (that will redirect back when logged in)
   */
  async function requireAuth() {
    if (!isLoggedIn.value) {
      const route = useRoute();
      await navigateTo("/login?return_to=" + encodeURIComponent(route.path));
    }
  }

  function hasPermission(code: UserPrivilegeCode): boolean {
    return user.value != null && user.value.permissions.codes.includes(code);
  }

  const isLoggedIn = computed(() => user.value !== null);

  return { user, privUser, isLoggedIn, fetchUser, logout, requireAuth, hasPermission };
}
