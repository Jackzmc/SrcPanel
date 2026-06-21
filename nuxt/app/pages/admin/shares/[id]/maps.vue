<template>
  <div>
    <div class="flex flex-col gap-4 mb-6">
      <div class="flex items-center gap-4">
        <UInput v-model="searchQuery" placeholder="Search maps..." icon="i-lucide-search" class="flex-1" />
        <div class="flex items-center gap-4">
          <span class="text-sm font-medium">Grid Size:</span>
          <input
            v-model="gridCols"
            type="range"
            min="1"
            max="4"
            class="flex-1"
          >
          <span class="text-sm">{{ gridCols }}</span>
        </div>
        <!-- TODO -->
        <USelectMenu v-model="sortBy" :items="SORT_OPTIONS" class="w-48" :search-input="false" />
        <UTooltip :text="sortTooltipText">
          <UButton
            :icon="sortDir === SortDirection.Ascending ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
            variant="outline"
            @click="sortDir = (sortDir === SortDirection.Ascending) ? SortDirection.Descending : SortDirection.Ascending"
          />
        </UTooltip>
      </div>

    </div>

    <div :class="['grid', `grid-cols-${gridCols}`, 'gap-3']">
      <MapCard v-for="map in maps" :key="map.filename" :map="map" :share="share" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AddonInfo, ShareInfo } from "@jzpanel/common/Share";
import type { AsyncDataRequestStatus } from "#app";
import MapCard from "~/components/shares/MapCard.vue";

enum SortDirection { Ascending, Descending }
const SORT_OPTIONS: { value: string; label: string; sortFn: (a: AddonInfo, b: AddonInfo) => number; defaultDirection: SortDirection }[] = [
  {
    value: "none",
    label: "Default",
    defaultDirection: SortDirection.Ascending,
    sortFn: () => 0,
  },
  {
    value: "lastUpdated",
    label: "Last Updated",
    defaultDirection: SortDirection.Descending,
    sortFn: (a, b) => (a.lastModified ?? 0) - (b.lastModified ?? 0),
  },
  // gamesPlayed: {
  //   label: "Games Played",
  //   defaultDirection: SortDirection.Descending,
  //   sortFn: (a, b) => {
  //     const aStats = getStats(a)
  //     const bStats = getStats(b)
  //     if(!aStats && !bStats) return 0
  //     if(!aStats) return -1
  //     if(!bStats) return 1
  //     return aStats.gamesPlayed - bStats.gamesPlayed
  //   }
  // },
  // rating: {
  //   label: "Rating",
  //   defaultDirection: SortDirection.Descending,
  //   sortFn: (a, b) => {
  //     const aStats = getStats(a)
  //     const bStats = getStats(b)
  //     if(!aStats && !bStats) return 0
  //     if(!aStats) return -1
  //     if(!bStats) return 1
  //     return Number(aStats.avgRating) - Number(bStats.avgRating)
  //   }
  // },
  {
    value: "title",
    label: "Title",
    defaultDirection: SortDirection.Ascending,
    sortFn: (a, b) => {
      const aName: string = a.collection?.name ?? a.workshop?.title ?? a.filename;
      const bName: string = b.collection?.name ?? b.workshop?.title ?? b.filename;
      return aName.localeCompare(bName);
    },
  },
  {
    value: "random",
    label: "Random",
    defaultDirection: SortDirection.Ascending,
    sortFn: () => {
      return Math.random() ? 1 : -1;
    },
  },
];

const props = defineProps<{
  share: ShareInfo;
  addons: AddonInfo[];
  status: AsyncDataRequestStatus;
}>();

useHead({
  title: `Maps - ${props.share.name} - Shares`,
});

const maps = computed(() => {
  const query = searchQuery.value?.toLocaleLowerCase();
  return props.addons
    .filter(addon => addon.meta.chapterIds != undefined)
    .filter(addon => {
      if (!query) return true;
      return addon.filename.toLocaleLowerCase().includes(query)
        || (addon.workshop && addon.workshop.title?.toLocaleLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (!sortBy.value) return 0;
      if (sortDir.value == SortDirection.Ascending) return sortBy.value.sortFn(a, b);
      else return sortBy.value.sortFn(b, a);
    });
});
const sortTooltipText = computed(() => {
  return `Toggle sort direction (is ${sortDir.value == SortDirection.Ascending ? "Ascending" : "Descending"})`;
});

const gridCols = ref(3);
const searchQuery = ref<string | undefined>();
const sortBy = ref(SORT_OPTIONS[0]);
const sortDir = ref<SortDirection>(SortDirection.Ascending);
</script>
