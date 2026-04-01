<template>
  <div class="flex flex-col gap-4">
    <ServerConsole :data="data" />
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

const props = defineProps<{
  data: ServerDetailed;
}>()

useHead({
  title: `Overview - ${props.data.server.name ?? props.data.server.id} - Server Info`
})
</script>
