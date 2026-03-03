<template>
  <div class="flex gap-4 mt-4">
    <UNavigationMenu
      orientation="vertical"
      :items="items"
      class="w-40 shrink-0"
    />
    <div class="flex-1 min-w-0">
      <NuxtPage :steamid="steamid" :data="data" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  tab: "overview"
})
import type { APIUserDetails } from '@common/User'

const props = defineProps<{
  steamid: string,
  data: APIUserDetails,
}>()

const items = [
  { label: 'Profile',  icon: 'i-lucide-user',          to: `/users/${props.steamid}/overview/profile` },
  { label: 'Names',    icon: 'i-lucide-text',          to: `/users/${props.steamid}/overview/names` },
]
</script>
