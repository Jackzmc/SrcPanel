<template>
  <div class="flex flex-col gap-4">
    <ServerConsole :data="data" />
  </div>

  <Teleport to="#sidebar">
    <UCard>Console Info</UCard>
  </Teleport>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@common/Server';
import ServerConsole from '@/components/servers/ServerConsole.vue'

const props = defineProps<{
  data: ServerDetailed;
}>()
</script>
