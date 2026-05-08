<template>
  <div class="flex gap-4 mt-4">
    <UNavigationMenu
      orientation="vertical"
      :items="items"
      class="w-48 shrink-0"
    />
    <div class="flex-1 min-w-0">
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  tab: "bans"
})
import type { APIUserDetails } from '@jzpanel/common/User'

const props = defineProps<{
  steamid: string
  data: APIUserDetails
}>()

</script>
