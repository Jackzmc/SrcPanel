<template>
  <UCard :ui="{ header: 'p-0 m-0 px-0 sm:px-0', body: 'py-2 sm:py-2 px-3 sm:px-3' }">
    <template #header>
      <ULink :to="linkTo" class="text-primary">
        <NuxtImg
          :src="map.workshop?.previewUrl"
          alt="Map Thumbnail"
          class="w-full object-cover aspect-square max-h-60"
          placeholder
          loading="lazy"
          fetchpriority="low"
        />
      </ULink>
    </template>
    <h2 class="text-lg font-bold">
      <ULink :to="linkTo" class="text-primary">
        {{ map.workshop?.title || map.filename }}
      </ULink>
    </h2>
    <p class="text-sm text-gray-500">
      {{ description }}
    </p>
    <div class="grid grid-cols-2 mt-4">
      <IconText v-if="lastUpdatedText" leading-icon="lucide:clock" :text="lastUpdatedText" class="text-sm" tooltip="When addon last downloaded" />
      <IconText class="text-right" leading-icon="lucide:file" :text="formatSize(map.filesize ?? 0)" tooltip="Size of the addon" />
      <div />
      <IconText
        v-if="map.meta.chapterIds"
        class="text-right"
        icon="lucide:book"
        :text="map.meta.chapterIds.length + ' chapters'"
        tooltip="Number of chapters in the map"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { formatSize, getRelDate } from "@jzpanel/common/format";
import type { AddonInfo, ShareInfo } from "@jzpanel/common/Share";

const MAX_DESCRIPTION_LENGTH = 300;

const props = defineProps<{
  map: AddonInfo;
  share: ShareInfo;
}>();

const linkTo = computed(() => {
  return { name: "admin-shares-id-maps", params: { id: props.share.id }, query: { file: props.map.filename } };
});

const description = computed(() => {
  if (props.map.workshop?.description) {
    if (props.map.workshop.description.length > MAX_DESCRIPTION_LENGTH) {
      return props.map.workshop.description.substring(0, MAX_DESCRIPTION_LENGTH) + "...";
    }
    return props.map.workshop.description;
  }
  return "No description available";
});

const lastUpdatedText = computed(() => {
  const timestamp = props.map.workshop?.lastUpdated || props.map.lastModified;
  if (!timestamp) return null;
  return "Updated " + getRelDate(timestamp);
});
</script>
