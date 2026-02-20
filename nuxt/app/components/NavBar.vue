<template>
  <UHeader title="admin.jackz.me">
    <template #left>
      <strong class="text-white font-sans text-2xl">JzPanel</strong>
      <UNavigationMenu
        :items="ROUTES"
        popover
        tooltip
        content-orientation="vertical"
        variant="pill"
        class="navbar"
        :ui="{
          link: 'text-white',
          linkTrailingBadge: 'bg-black',
          linkLeadingIcon: 'text-white',
        }"
      />
    </template>


    <template #right>
      <UInput
        variant="subtle"
        placeholder="Search"
        icon="ri:search-2-line"
      />
      <UColorModeButton class="text-white" />
      <template v-if="isLoggedIn">
        <UDropdownMenu
          :items="USER_DROPDOWN"
          :ui="{
            content: 'w-48 px-2',
            item: 'py-2',
          }"
        >
          <UButton
            class="hover:bg-white/15 w-46 text-white"
            variant="ghost"
            block
            trailing-icon="i-lucide-chevron-down"
          >
            <UAvatar :src="false && user!.user.avatarhash ? `https://avatars.akamai.steamstatic.com/${user!.user.avatarhash}_medium.jpg` : undefined" />
            {{ user!.user.name }}
          </UButton>
        </UDropdownMenu>
      </template>
      <template v-else>
        <UButton to="/login" color="neutral" variant="subtle" class="text-white">
          Login
        </UButton>
      </template>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.js';
import type { NavigationMenuItem } from '@nuxt/ui/runtime/components/NavigationMenu.vue.js';

const { user, isLoggedIn, logout } = useAuth()

const USER_DROPDOWN: DropdownMenuItem[][] = [
  [
    {
      href: "/users/@me",
      label: "My Profile"
    },
    {
      href: "#settings",
      label: "Settings"
    },
    {
      href: "/panel/overview",
      label: "Panel Administration"
    }
  ],
  [
    {
      label: "Logout",
      class: "text-error",
      onSelect: logout,
    }
  ]
]

const ADMIN_DROPDOWN: NavigationMenuItem = {
  href: "/admin",
  label: "Administration",
  description: "Admin tools",
  icon: "lucide:toolbox",
  children: [
    {
      href: "/admin/logs",
      label: "Audit Logs",
      icon: "ri:file-list-3-line"
    },
    {
      href: "/admin/players/recent",
      label: "Manage Players",
      icon: "ri:group-line"
    }
  ]
}


const ROUTES = computed<NavigationMenuItem[]>(() => [
  {
    href: "/",
    label: "Overview",
    description: "Server status & instructions"
  },
  {
    href: "/docs",
    label: "Info",
    icon: "ri:file-line",
    children: [
      {
        href: "/docs/maps",
        label: "L4D2 Maps"
      },
      {
        href: "/docs/ftt",
        label: "Feed The Trolls",
        icon: ""
      }
    ]
  },
  {
    label: "Docs",
    description: "Documentation",
    children: [
      {
        href: "/docs/commands",
        label: "Commands",
        icon: "ri:slash-commands"
      },
      {
        href: "/docs/cvars",
        label: "Cvars",
        icon: "ri:settings-2-line"
      },
      {
        href: "/docs/keybinds",
        label: "Keybind Generator",
        icon: "ri:keyboard-line"
      },
      {
        href: "/docs/tutorials",
        label: "Tutorials",
        icon: "ri:question-fill"
      }
    ]
  },
  ...(isLoggedIn.value ? [ADMIN_DROPDOWN] : []),
  { label: "Links", description: "External links" },
  { href: "/discuss", label: "Discuss", description: "Admin panel discussions" },
])
</script>

<style>
  .light .navbar li a {
    &[aria-current="page"] {
      color: black;
    }
  }
</style>
