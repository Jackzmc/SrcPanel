<template>
  <UCard :class="cardClass">
    <div class="flex items-center justify-between pb-2 border-b border-b-black">
      <div class="flex items-center gap-2">
        <a class="text-lg text-black">{{ server.name }}</a>
        <!-- buttons -->
        <UBadge :color="server.online ? 'neutral' : 'neutral'" variant="outline" class="text">
          <UIcon
            :name="server.online ? 'i-lucide-circle' : 'i-lucide-square'"
            :class="server.online ? 'text-success' : 'text-error'"
            class="size-3"
          />
          {{ server.online ? 'Online' : 'Offline' }}
        </UBadge>
      </div>
      <!-- Status -->
      <span v-if="server.online && server.status.data" class="ml-auto text-black text-lg">
        <IconText leading-icon="lucide:users" >
          <span :class="['font-semibold', {
            'text-black': server.online && server.status.data.players.length === 0,
            'text-info': server.status.data.players.length > 0
          }]">
          {{ server.status.data.players.length }}</span>/{{ server.status.data.maxplayers }} <span class="text-sm">players</span>
        </IconText>
      </span>
    </div>

    <div class="mt-2 text-sm text-muted space-y-1">
      <!-- Playing [gamemode] on [map] -->
      <div v-if="server.status?.data" class="flex items-center gap-1 pb-2 text-black border-b border-b-neutral-400">
        <UIcon name="i-lucide-map" class="size-4 text-black" />
        <span>Playing</span>
        <b>{{ server.status.data.gamemode }}</b>
        <span>on</span>
        <b>{{ server.status.data.map }}</b>
      </div>
      <!-- Direct connect command -->
      <UTooltip
        text="Direct connect command. Click to copy"
        :content="{
          align: 'start',
          side: 'top',
          sideOffset: 8
        }"
      >
        <div class="flex items-center gap-1 border-b border-b-neutral-400">
          <UIcon name="i-lucide-play" class="size-4 text-black" />
          <code :class="['!bg-inherit p-1',textColor]">
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
        <div class="flex items-center gap-1 border-b border-b-neutral-400">
          <UIcon name="i-lucide-list" class="size-4 text-black" />
          <code :class="['!bg-inherit p-1',textColor]">
            <ClickCopy :text="createLobbyCommand">
              <b>mm_dedicated_force_servers</b> {{ server.ip }}:{{ server.port }}
            </ClickCopy>
          </code>
        </div>
      </UTooltip>
    </div>

    <div class="flex justify-between items-center gap-1 mt-2">
      <div class="flex gap-1">
        <UButton color="info" variant="outline" size="md">
          <a :href="'steam://connect/' + server.ip + '/' + server.port">Join</a>
        </UButton>
        <UButton color="neutral" variant="outline" size="md">
          <a :href="'/servers/' + group.id + '/' + server.id">Manage</a>
        </UButton>
      </div>
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
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { APIListServersV1_Group, APIListServersV1_Server, GroupInfo, ServerInfo } from '@common/Server'
import ClickCopy from '@/components/ClickCopy.vue'

const props = defineProps<{
  group: GroupInfo | APIListServersV1_Group
  server: ServerInfo | APIListServersV1_Server
}>()

const cardClass = computed(() => {
  if (props.server.online) {
    return props.server.status.data && props.server.status.data?.players.length > 0
      ? "bg-info-100 text-black"
      : "bg-emerald-200 text-black"
  }
  return "bg-yellow-50"
})

const connectCommand = computed(() => {
  return `connect ${props.server.host}:${props.server.port}`
})

const createLobbyCommand = computed(() => {
  return `mm_dedicated_force_servers ${props.server.ip}:${props.server.port}`
})

const numPlayers = computed(() => {
  if(!props.server.online) return null
  return props.server.status.data && props.server.status.data?.players.length
})

const textColor = computed(() => {
  if(numPlayers.value == undefined) return "!text-black"
  if(numPlayers.value === 0) return "!text-black"
  return "!text-info"
})
</script>
