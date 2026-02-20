<template>
  <UCard :class="server.online ? 'bg-emerald-50' : 'bg-yellow-50'">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UIcon
          :name="server.online ? 'i-lucide-circle' : 'i-lucide-square'"
          :class="server.online ? 'text-success' : 'text-error'"
          class="size-3"
        />
        <span class="font-medium">{{ server.name }}</span>
      </div>
      <UBadge :color="server.online ? 'success' : 'neutral'" variant="subtle">
        {{ server.online ? 'Online' : 'Offline' }}
      </UBadge>
    </div>

    <div class="mt-2 text-sm text-muted space-y-1">
      <div class="flex items-center gap-1">
        <UIcon name="i-lucide-monitor" class="size-4" />
        {{ server.host }}:{{ server.port }}
      </div>
      <div v-if="server.status?.data" class="flex items-center gap-1">
        <UIcon name="i-lucide-map" class="size-4" />
        {{ server.status.data.map }}
        <span class="ml-auto">
          {{ server.status.data.players.length }}/{{ server.status.data.maxplayers }}
        </span>
      </div>
    </div>

    <div v-if="server.tags?.length" class="mt-2 flex flex-wrap gap-1">
      <UBadge v-for="tag in server.tags" :key="tag" color="neutral" variant="outline" size="sm">
        {{ tag }}
      </UBadge>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { ServerInfo } from '@common/Server'

defineProps<{
  server: ServerInfo
}>()
</script>
