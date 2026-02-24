<template>
  <div :class="['grid', `grid-cols-${gridCols}`]">
    <UCard v-for="addon in addons" :key="addon.id">
      <div class="flex flex-col">
        <h3 class="text-lg font-bold">{{ addon.name }}</h3>
        <p class="text-sm text-gray-500">{{ addon.description }}</p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { formatDate, formatSize } from '@common/methods/format'
import type { TableColumn } from '@nuxt/ui'
import type { AddonInfo, ShareInfo } from '@common/Share';
import type { AsyncDataRequestStatus } from '#app';

const props = defineProps<{
  share: ShareInfo,
  addons: AddonInfo[],
  status: AsyncDataRequestStatus
}>()

const gridCols = ref(3)
</script>
