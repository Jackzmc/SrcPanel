<template>
  <div :class="['grid', `grid-cols-${gridCols}`, 'gap-3']">
    <MapCard v-for="map in maps" :key="map.filename" :map="map" />
  </div>
</template>

<script setup lang="ts">
import type { AddonInfo, ShareInfo } from '@common/Share';
import type { AsyncDataRequestStatus } from '#app';
import MapCard from '~/components/shares/MapCard.vue';

const props = defineProps<{
  share: ShareInfo,
  addons: AddonInfo[],
  status: AsyncDataRequestStatus
}>()

const maps = props.addons.filter(addon => addon.meta.chapterIds != undefined)

const gridCols = ref(3)
</script>
