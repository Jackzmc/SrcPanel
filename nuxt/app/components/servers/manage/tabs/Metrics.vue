<template>
  <div class="flex flex-col gap-4">
    graphs
  </div>

  <template #sidebar>
    <UCard>Averages</UCard>
  </template>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@common/Server';

const props = defineProps<{
  data: ServerDetailed;
}>()
</script>
