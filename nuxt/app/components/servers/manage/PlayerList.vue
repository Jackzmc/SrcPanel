<template>
  <div class="flex flex-col gap-1">
    <PlayerListEntry v-for="client in clients"
      :key="client.userid"
      :server="data.server"
      :client="client"
    />
    <p v-if="clients.length === 0" class="text-muted text-center p-4">No players connected</p>
  </div>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@jzpanel/common/Server';
import PlayerListEntry from './PlayerListEntry.vue';
import type { WebsocketExport } from '~/composables/server/live.js';

const props = defineProps<{
  data: ServerDetailed
  ws: WebsocketExport
}>()

const clients = computed(() => {
  if(!props.ws.live.value?.clients) return []
  return Object.values(props.ws.live.value.clients)
    .map((client) => {
      let team = 0
      if(client.survivor) team = 1
      if(client.infected) team = 2
      return {
        ...client,
        team,
        isBot: client.steamid == 'BOT'
      }
    })
    .sort((a,b) => {
      // Sort players before bots
      if(a.team === b.team) {
        if(a.isBot && !b.isBot) return 1
        if(!a.isBot && b.isBot) return -1
      }

      return a.team - b.team
    })
})
</script>
