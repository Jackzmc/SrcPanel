<template>
  <UCard class="bg-light-blue" as="a" :href="`/admin/shares/${share.id}`">
    <h3 class="text-xl font-bold">
      {{ share.name }}
    </h3>
    <!-- <UBadge v-if="share.steamAppid" class="text-right">{{ share.steamAppid }}</UBadge> -->

    <h4 class="text-md font-semibold">
      Destinations
    </h4>
    <div v-if="Object.keys(share.destinations).length > 0" class="mt-2 flex flex-wrap gap-1">
      <template v-for="_, id in share.destinations" :key="id">
        <UBadge :label="id" color="neutral" variant="outline">
          {{ id }}
        </UBadge>
      </template>
    </div>
    <p v-else class="px-4 text-muted">
      No destinations
    </p>

    <h4 class="text-md font-semibold mt-2">
      Sources
    </h4>
    <div v-if="enabledSources.length > 0" class="mt-2 flex flex-wrap gap-1">
      <template v-for="id in enabledSources" :key="id">
        <UBadge color="neutral" variant="solid">
          {{ id.replace(/_/g, ' ') }}
        </UBadge>
      </template>
    </div>
    <p v-else class="px-4 text-muted">
      No sources
    </p>

  </UCard>
</template>

<script setup lang="ts">
import type { ShareData } from "@jzpanel/common/Share";

const props = defineProps<{
  share: ShareData;
}>();

const enabledSources = computed(() => {
  return Object.entries(props.share.downloadSources)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);
});
</script>
