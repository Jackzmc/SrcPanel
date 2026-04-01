<template>
  <div>
    <div class="bg-black dark:bg-blue-950 text-white min-h-20 rounded-t-md p-4 text-xs font-mono">
      <div>
        <IconText leading-icon="lucide:loader-circle" leading-icon-class="animate-spin" text="Fetching logs..." />
      </div>
      <div>
        No current log entries. New entries will appear here as they are received.
      </div>


    </div>
      <UInput
        type="text"
        leading-icon="lucide:terminal"
        placeholder="Enter a command"
        :ui="{ root: 'w-full', base: 'py-2 px-2 rounded-none bg-black dark:bg-blue-950 text-white' }"
      />
  </div>
</template>

<script setup lang="ts">
import type { ServerDetailed } from '@common/Server';

const props = defineProps<{
  data: ServerDetailed
}>()
</script>
