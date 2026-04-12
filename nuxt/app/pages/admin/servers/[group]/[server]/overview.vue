<template>
  <div class="flex flex-col gap-4">
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
import type { ServerDetailed } from '@common/Server';
import VoiceMembers from '@/components/servers/manage/VoiceMembers.vue'
import PlayerList from '@/components/servers/manage/PlayerList.vue'
import type { WebsocketExport } from '~/composables/server/live.js';

const props = defineProps<{
  data: ServerDetailed;
  ws: WebsocketExport
}>()

useHead({
  title: `Overview - ${props.data.server.name ?? props.data.server.id} - Server Info`
})
</script>
