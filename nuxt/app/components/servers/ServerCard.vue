<template>
  <UCard :class="cardClass">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <a class="font-medium">{{ server.name }}</a>
        <!-- buttons -->
        <UButton color="info" variant="outline" size="xs">
          <a :href="'steam://connect/' + server.ip + '/' + server.port">Join</a>
        </UButton>
        <UButton color="neutral" variant="outline" size="xs">
          <a :href="'/servers/' + group.id + '/' + server.id">Manage</a>
        </UButton>
      </div>
      <!-- Status -->
      <UBadge :color="server.online ? 'success' : 'neutral'" variant="subtle">
        <UIcon
          :name="server.online ? 'i-lucide-circle' : 'i-lucide-square'"
          :class="server.online ? 'text-success' : 'text-error'"
          class="size-3"
        />
        {{ server.online ? 'Online' : 'Offline' }}
      </UBadge>
    </div>

    <div class="mt-2 text-sm text-muted space-y-1">
      <!-- Direct connect command -->
      <UTooltip
        text="Direct connect command. Click to copy"
        :content="{
          align: 'start',
          side: 'top',
          sideOffset: 8
        }"
      >
        <div class="flex items-center gap-1">
          <UIcon name="i-lucide-play" class="size-4" />
          <code class="bg-old-neutral-50 p-1">
            <ClickCopy :text="connectCommand">
              <b>connect</b> {{ server.host }}:{{ server.port }}
            </ClickCopy>
          </code>
        </div>
      </UTooltip>
      <!-- Create lobby command -->
      <UTooltip
        text="Create lobby command. Click to copy"
        :content="{
          align: 'start',
          side: 'top',
          sideOffset: 8
        }"
      >
        <div class="flex items-center gap-1">
          <UIcon name="i-lucide-list" class="size-4" />
          <code class="bg-old-neutral-50 p-1">
            <ClickCopy :text="createLobbyCommand">
              <b>mm_dedicated_force_servers</b> {{ server.ip }}:{{ server.port }}
            </ClickCopy>
          </code>
        </div>
      </UTooltip>
      <!-- Playing [gamemode] on [map] -->
      <div v-if="server.status?.data" class="flex items-center gap-1">
        <UIcon name="i-lucide-map" class="size-4" />
        <span>Playing</span>
        <b>{{ server.status.data.gamemode }}</b>
        <span>on</span>
        <b>{{ server.status.data.map }}</b>
      </div>
    </div>

    <div class="flex items-center gap-1">
      <UTooltip
        text="Server tags"
        :content="{
          align: 'center',
          side: 'left',
          sideOffset: 8
        }"
      >
        <div class="mt-2 flex flex-wrap gap-1">
          <UBadge v-for="tag in server.tags" :key="tag" color="neutral" variant="outline" size="md">
            {{ tag }}
          </UBadge>
        </div>
      </UTooltip>
      <span v-if="server.status.data" class="ml-auto">
        {{ server.status.data.players.length }}/{{ server.status.data.maxplayers }} online
      </span>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { APIListServersV1_Group, GroupInfo, ServerInfo } from '@common/Server'
import ClickCopy from '@/components/ClickCopy.vue'

const props = defineProps<{
  group: GroupInfo | APIListServersV1_Group
  server: ServerInfo
}>()

const cardClass = computed(() => {
  if (props.server.online) {
    return props.server.status.data && props.server.status.data?.players.length > 0
      ? "bg-info-50"
      : "bg-emerald-50"
  }
  return "bg-yellow-50"
})

const connectCommand = computed(() => {
  return `connect ${props.server.host}:${props.server.port}`
})

const createLobbyCommand = computed(() => {
  return `mm_dedicated_force_servers ${props.server.ip}:${props.server.port}`
})
</script>
