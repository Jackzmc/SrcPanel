<template>
  <UHeader :ui="{ container: 'max-w-none' }">
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
            item: 'py-2'
          }"
        >
          <UButton
            class="hover:bg-white/15 w-46 text-white"
            variant="ghost"
            block
            trailing-icon="i-lucide-chevron-down"
          >
            <UAvatar :src="user!.user.avatarhash ? `https://avatars.akamai.steamstatic.com/${user!.user.avatarhash}_medium.jpg` : undefined" />
            {{ user!.user.name }}
          </UButton>
        </UDropdownMenu>
      </template>
      <template v-else>
        <SteamLoginButton />
      </template>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.js'
import type { NavigationMenuItem } from '@nuxt/ui/runtime/components/NavigationMenu.vue.js'
import SteamLoginButton from './oauth/SteamLoginButton.vue'

const { user, isLoggedIn, logout } = useAuth()

const docs = await queryCollection("docs").all()

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
  label: "Administration",
  description: "Admin tools",
  icon: "lucide:toolbox",
  children: [
    {
      href: "/admin/audit",
      label: "Audit Logs",
      icon: "lucide:logs"
    },
    {
      href: "/admin/shares",
      label: "Addons & Files",
      icon: "lucide:folder-tree"
    },
    {
      href: "/admin/servers",
      label: "Manage Servers",
      icon: "lucide:server"
    },
    {
      href: "/admin/players/recent",
      label: "Manage Players",
      icon: "lucide:users"
    },
    {
      href: "/admin/bans",
      label: "Player Bans",
      icon: "lucide:gavel"
    },
    {
      href: "/admin/notes",
      label: "Player Notes",
      icon: "lucide:sticky-note"
    },
  ]
}

const EXTERNAL_LINKS: NavigationMenuItem[] = [
  {
    href: "https://stats.jackz.me/",
    label: "Game Stats",
    icon: "lucide:chart-pie"
  },
  {
    href: "https://data.jackz.me/public/dashboard/295194e5-e4c3-41a9-9298-0ea2a895f881",
    label: "Extended Stats",
    icon: "lucide:chart-column-big"
  },
  {
    href: "https://steamcommunity.com/groups/jackzl4d2",
    label: "Steam Group",
    icon: "simple-icons:steam"
  }
]

const ROUTES = computed<NavigationMenuItem[]>(() => [
  {
    href: "/",
    label: "Overview",
    description: "Server status & instructions",
    icon: "lucide:house"
  },
  {
    label: "Docs",
    description: "Simple tools",
    icon: "lucide:book",
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
        href: "/docs/maps",
        label: "L4D2 Maps",
        icon: 'ri:map-line'
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
    {
    label: "Tools",
    description: "Documentation pages for various things",
    icon: "lucide:component",
    children: docs.map(doc => {
      return {
        href: doc.path,
        label: doc.title,
        // icon: doc.icon
      }
    })
  },
  ...(isLoggedIn.value ? [ADMIN_DROPDOWN] : []),
  {
    label: "Links",
    description: "External links",
    icon: "lucide:link",
    children: EXTERNAL_LINKS
  },
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
