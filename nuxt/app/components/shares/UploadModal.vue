<template>
  <UModal open>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium">Upload Modal</h3>
        <UButton icon="i-flucide-close" @click="$emit('close')" />
      </div>
    </template>
    <div class="p-4">
    </div>
  </UModal>
</template>

<script setup lang="ts">
import type { ShareInfo } from '@common/Share';

const props = defineProps<{
  share: ShareInfo
}>()
</script>
