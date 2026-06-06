<template>
  <UHeader 
    :ui="{ 
      container: 'max-w-none', 
      toggle: openClassText
      }" 
    class="group-header"
    @update:open="s => open = s"
  >
    <template #title>
      <strong :class="['font-sans text-2xl',openClassText]">{{ appName }}</strong>
    </template>

    <template #left>
      <strong :class="['font-sans text-2xl',openClassText]">{{ appName }}</strong>
      <UNavigationMenu
        :items="ROUTES"
        popover
        tooltip
        orientation="horizontal"
        content-orientation="vertical"
        variant="pill"
        class="navbar hidden md:block"
        :ui="{
          link: 'text-white group',
          linkTrailingBadge: 'bg-black',
          linkLeadingIcon: 'group-data-[active]:text-black dark:group-data-[active]:text-white text-white'
        }"
      />
    </template>

    <template #body>
      <UNavigationMenu
        :items="ROUTES"
        popover
        tooltip
        orientation="vertical"
        content-orientation="vertical"
        variant="pill"
        class="navbar"
        :ui="{
          link: '',
          linkTrailingBadge: 'bg-black',
        }"
      />
    </template>

    <template #right>
      <UInput
        variant="subtle"
        placeholder="Search"
        icon="ri:search-2-line"
        class="hidden md:block"
      />
      <UColorModeButton :class="[openClassText,'hover:light:text-muted']" />
      <template v-if="isLoggedIn">
        <UDropdownMenu
          :items="userDropdown"
          :ui="{
            content: 'px-2',
            item: 'py-2'
          }"
        >
          <UButton
            :class="['hover:bg-white/15 w-max',openClassText]"
            variant="ghost"
            block
            trailing-icon="i-lucide-chevron-down"
          >
            <UAvatar 
              :src="user!.user.avatarhash ? `https://avatars.akamai.steamstatic.com/${user!.user.avatarhash}_medium.jpg` : undefined" 
            />
            <span class="hidden md:block">{{ user!.user.name }}</span>
          </UButton>
        </UDropdownMenu>
      </template>
      <template v-else>
        <UButton leading-icon="lucide:user-circle" 
          color="neutral" 
          size="lg"
          to="/login"
        >Login</UButton>
      </template>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.js'
import type { NavigationMenuItem } from '@nuxt/ui/runtime/components/NavigationMenu.vue.js'

const emit = defineEmits(["open-settings"])

const { user, isLoggedIn, logout } = useAuth()
const { appName } = useAppConfig()

const docs = await queryCollection("docs").all()

const openClassText = computed(() => {
  return open.value ? "text-black dark:text-white" : "text-white"
})

const docsDropdown = computed(() => {
  return {
    label: "Docs",
    description: "Documentation pages for various things",
    icon: "lucide:book",
    children: docs.map(doc => {
      return {
        href: doc.path,
        label: doc.title,
        // icon: doc.icon
      }
    }).concat([
      {
        href: "/docs/ftt",
        label: "Feed The Trolls",
      },
      {
        href: "/docs/info",
        label: "Rules & Procedures"
      },
    ])
  }
})

const adminDropdown: NavigationMenuItem = {
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

const linksDropdown = computed(() => {
  const list: NavigationMenuItem[] = [
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
    },
    {
      href: "https://fluxer.gg/7opLPRTU",
      label: "Fluxer.gg Server",
      admin: true
    },
    {
      href: "https://app.youform.com/forms/uzxsbsaf",
      label: "Anonymous Report Form",
      icon: "lucide:form",
      admin: true
    }
  ]
  return {
    label: "Links",
    description: "External links",
    icon: "lucide:link",
    children: list.filter(item => isLoggedIn.value || !item.admin)
  }
})

const ROUTES = computed<NavigationMenuItem[]>(() => [
  {
    href: "/",
    label: "Overview",
    description: "Server status & instructions",
    icon: "lucide:house"
  },
  docsDropdown.value,
  {
    label: "Tools",
    description: "Simple tools",
    icon: "lucide:component",
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
  ...(isLoggedIn.value ? [adminDropdown] : []),
  linksDropdown.value,
  { href: "/discuss", label: "Discuss", description: "Admin panel discussions" },
])

const userDropdown: DropdownMenuItem[][] = [
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

const open = ref(false)
</script>

<style>
  .light .navbar li a {
    &[aria-current="page"] {
      color: black;
    }
  }
</style>
