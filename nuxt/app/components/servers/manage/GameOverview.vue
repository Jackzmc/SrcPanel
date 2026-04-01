<template>
  <UCard :ui="{ body: '!p-4 !sm:p-6 mx-2 py-0 my-0 !py-1' }">
    <div class="flex gap-4">
      <div  v-if="data.server.status.data" class="pr-20 my-2 border-r border-r-gray-200">
        <h2 class="text-sm font-bold text-nowrap">Death Toll</h2>
        <p class="text-xs text-nowrap">Chapter 5 - BoatHouse</p>
      </div>
      <div v-else class="pr-20 my-2 border-r border-r-gray-200">
        <h2 class="text-sm font-bold text-nowrap">No Data</h2>
        <p class="text-xs text-nowrap">Server offline or unreachable</p>
      </div>
      <div class="flex gap-6 items-center justify-between w-full">
        <div class="flex flex-col items-center justify-center">
          <p class="text-xs text-muted">Gamemode</p>
          <p v-if="data.server.status.data" class="font-semibold text-md">{{ data.server.status.data?.gamemode }}</p>
          <p v-else class="text-md text-muteed">-</p>
        </div>
        <div class="flex flex-col items-center justify-center">
          <p class="text-xs text-muted">Difficulty</p>
          <p v-if="data.server.status.data" class="font-semibold text-md">Expert</p>
          <p v-else class="text-md text-muteed">-</p>
        </div>
        <div class="flex flex-col items-center justify-center">
          <p class="text-xs text-muted">Players</p>
          <p v-if="data.server.status.data" class="font-semibold text-md">0 / 4</p>
          <p v-else class="text-md text-muteed">-</p>
        </div>
        <div class="flex flex-col items-center justify-center">
          <p class="text-xs text-muted">In Voice</p>
          <p class="font-semibold text-md">0</p>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@common/Server';

const props = defineProps<{
  data: ServerDetailed;
}>()
</script>
