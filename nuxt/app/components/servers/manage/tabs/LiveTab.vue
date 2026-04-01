<template>
  <div class="flex flex-col gap-4">
    <UCard>Game Info</UCard>
    <UCard>Players list</UCard>
  </div>

  <template #sidebar>
   <VoiceMembers :server-id="data.server.id" :voice-members="data?.voiceMembers" />
  </template>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@common/Server';
import VoiceMembers from '@/components/servers/manage/VoiceMembers.vue'

const props = defineProps<{
  data: ServerDetailed;
}>()
</script>
