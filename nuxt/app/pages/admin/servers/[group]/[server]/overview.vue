<template>
  <div class="flex flex-col gap-4">
    <UAlert v-if="gameState === GameState.Transitioning" title="Transitioning to next map" variant="soft" icon="lucide:loader-circle" :ui="{'icon': 'animate-spin'}" />
    <UAlert v-else-if="gameState === GameState.Hibernating" title="Server is hibernating" variant="soft" />
    <UCard>
      <PlayerList :data="props.data" :ws="ws" />
    </UCard>
  </div>

  <ClientOnly>
    <Teleport to="#sidebar">
      <VoiceMembers :server-id="data.server.id" :voice-members="data?.voiceMembers" />
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@jzpanel/common/Server';
import VoiceMembers from '@/components/servers/manage/VoiceMembers.vue'
import PlayerList from '@/components/servers/manage/PlayerList.vue'
import type { WebsocketExport } from '~/composables/server/live.js';
import { GameState } from '@jzpanel/common/Live';

const props = defineProps<{
  data: ServerDetailed;
  ws: WebsocketExport
}>()

const gameState = computed(() => {
  return props.ws.live.value?.game?.state
})

useHead({
  title: `Overview - ${props.data.server.name ?? props.data.server.id} - Server Info`
})
</script>
