<template>
  <div class="mt-4">
    <p class="text-muted">Notes coming soon.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  tab: "notes"
})
import type { APIUserDetails } from '@common/User'

defineProps<{
  steamid: string
  data: APIUserDetails
}>()
</script>
