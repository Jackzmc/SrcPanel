<template>
  <div class="flex flex-col gap-1">
    <template v-if="liveClients">
      <LivePlayerListEntry v-for="client in liveClients"
        :key="client.userid"
        :server="data.server"
        :client="client"
      />
    </template>
    <template v-else-if="playerNames">
      <h3 v-if="playerNames.length > 0" class="text-md font-semibold">Online Players</h3>
      <br>
      <ul class="list-inside list-disc">
        <li v-for="name in playerNames" :key="name">
          {{ name }}
        </li>
      </ul>
      <p v-if="playerNames.length === 0" class="text-muted text-center p-4">No players connected</p>
    </template>
    <p v-else class="text-muted text-center p-4">No server data available</p>
  </div>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@jzpanel/common/Server';
import LivePlayerListEntry from './LivePlayerListEntry.vue';
import type { WebsocketExport } from '~/composables/server/live.js';

const props = defineProps<{
  data: ServerDetailed
  ws: WebsocketExport
}>()

const liveClients = computed(() => {
  if(!props.ws.live.value?.clients) return undefined
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
        return a.userid - b.userid // Ensure sorted by userid
      }

      return a.team - b.team
    })
})

const playerNames = computed(() => {
  if(liveClients.value) return liveClients.value.map(client => client.name)
  return props.ws.serverStatus.value?.data?.players
})
</script>
