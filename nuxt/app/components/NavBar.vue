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
          linkLeadingIcon: 'text-white'
        }"
      />
    </template>


    <template #right>
      <UInput
        variant="subtle"
        placeholder="Search"
        icon="ri:search-2-line"
      />
      <UColorModeButton />
      <UDropdown>
        <UButton
          class="w-46"
          color="neutral"
          variant="ghost"
          block
          trailing-icon="i-lucide-chevron-down"
        >
          <UAvatar src="https://github.com/benjamincanac.png" />
          Jackzie
        </UButton>
      </UDropdown>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui/runtime/components/NavigationMenu.vue.js';

const ROUTES: NavigationMenuItem[] = [
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
  {
    href: "/admin",
    label: "Administration",
    description: "Admin tools",
    icon: "ri:tools-line",
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
  },
  { label: "Links", description: "External links" },
  { href: "/discuss", label: "Discuss", description: "Admin panel discussions" }
]
</script>

<style>
  .light .navbar li a {
    &[aria-current="page"] {
      color: black;
    }
  }
</style>
