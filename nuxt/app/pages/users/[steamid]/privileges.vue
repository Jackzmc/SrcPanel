<template>
  <div class="flex gap-4 mt-4">
    <UNavigationMenu
      orientation="vertical"
      :items="items"
      class="w-48 shrink-0"
    />
    <div class="flex-1 min-w-0">
      <NuxtPage :steamid="steamid" :data="data" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  tab: "privileges"
})
import type { APIUserDetails } from '@common/User'

const props = defineProps<{
  steamid: string
  data: APIUserDetails
}>()

const items = [
  { label: 'Overview',          icon: 'i-lucide-info',          to: `/users/${props.steamid}/privileges/overview` },
  { label: 'Groups',            icon: 'i-lucide-users',         to: `/users/${props.steamid}/privileges/groups` },
  { label: 'Base Permissions',  icon: 'i-lucide-shield',        to: `/users/${props.steamid}/privileges/base-permissions` },
  { label: 'Actions',           icon: 'i-lucide-wrench',        to: `/users/${props.steamid}/privileges/actions` },
]
</script>
