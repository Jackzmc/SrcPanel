<template>
  <div class="flex flex-col gap-4">
    <ServerConsole :data="data" />
    <VoiceMembers :server-id="data.server.id" :voice-members="data?.voiceMembers" />
  </div>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@common/Server';
import VoiceMembers from '@/components/servers/manage/VoiceMembers.vue'
import ServerConsole from '@/components/servers/ServerConsole.vue'

const props = defineProps<{
  data: ServerDetailed;
}>()
</script>
