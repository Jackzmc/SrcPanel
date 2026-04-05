<template>
  <div class="flex flex-col gap-4">
    <ServerConsole :data="data" :logs="ws?.logs" />

    <UAlert color="warning"
      title="Console gives you full acess to the server with every command available to you. Every command you use does not run as you but as the server. Access is a privilege and every command used is logged."
    />
  </div>

  <ClientOnly>
    <Teleport to="#sidebar">
      <UCard>Console Info</UCard>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@common/Server';
import ServerConsole from '@/components/servers/ServerConsole.vue'
import type { LiveExport } from '~/composables/server/live';

const props = defineProps<{
  data: ServerDetailed;
  ws: LiveExport
}>()

useHead({
  title: `Manage - ${props.data.server.name ?? props.data.server.id} - Server Info`
})
</script>
