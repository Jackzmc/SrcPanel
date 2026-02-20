<template>
  <UContainer>
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-8" />
    </div>
    <div v-else-if="error" class="py-12">
      <UAlert color="error" title="Failed to load servers" :description="error.message" />
    </div>
    <ServersServerGroupList v-else-if="groups" :groups="groups" />
  </UContainer>
</template>

<script setup lang="ts">
import type { APIListServersV1 } from '@common/Server'

const api = useApi()

const { data: groups, pending, error } = await useAsyncData<APIListServersV1>(
  'servers',
  () => api('/servers')
)
</script>
