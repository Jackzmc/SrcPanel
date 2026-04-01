<template>
  <div class="flex flex-col gap-4">
    graphs
  </div>

  <ClientOnly>
    <Teleport to="#sidebar">
      <UCard>Averages</UCard>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@common/Server';

const props = defineProps<{
  data: ServerDetailed;
}>()

useHead({
  title: `Metrics - ${props.data.server.name ?? props.data.server.id} - Server Info`
})
</script>
