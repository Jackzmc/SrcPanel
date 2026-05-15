<template>
  <div>
    <p class="text-muted">Create New Ban!</p>
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails } from '@jzpanel/common/User'

defineProps<{
  steamid: string
  data: APIUserDetails
}>()
</script>