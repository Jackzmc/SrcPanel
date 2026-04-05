<template>
  <div class="flex flex-col gap-1">
    <PlayerListEntry v-for="client in clients"
      :key="client.userid"
      :server="data.server"
      :client="client"
    />
  </div>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@common/Server';
import PlayerListEntry from './PlayerListEntry.vue';

const props = defineProps<{
  data: ServerDetailed
}>()

const clients = computed(() => {
  if(!props.data.live) return []
  return Object.values(props.data.live.clients)
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
