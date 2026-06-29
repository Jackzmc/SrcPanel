<template>
  <div v-if="stats" class="flex justify-around flex-row gap-6 py-4 flex-wrap">
    <div>
      <h4 class="text-md font-semibold">
        Playtime
      </h4>
      <p>{{ playtime }}</p>
    </div>
    <div>
      <h4 class="text-md font-semibold">
        First Joined
      </h4>
      <p v-if="stats.created_date">
        {{ formatDate(stats.created_date, true) }}
      </p>
      <p v-if="stats.created_date" class="text-muted">
        {{ getRelDate(stats.created_date) }}
      </p>
      <p v-else>
        Never
      </p>
    </div>
    <div>
      <h4 class="text-md font-semibold">
        Last Online
      </h4>
      <p v-if="stats.last_join_date">
        {{ formatDate(stats.last_join_date, true) }}
      </p>
      <p v-if="stats.last_join_date" class="text-muted">
        {{ getRelDate(stats.last_join_date) }}
      </p>
      <p v-else>
        Never
      </p>
    </div>
    <div>
      <h4 class="text-md font-semibold">
        Country
      </h4>
      <p>{{ stats.country }}</p>
      <p>{{ stats.region }}</p>
    </div>
    <!-- <div>
      <h4 class="text-md font-semibold">Friendly Fires</h4>
      <p>{{ stats.damage_dealt_friendly_count }}x</p>
      <p>{{ stats.damage_dealt_friendly }} HP</p>
    </div> -->
  </div>
  <div v-else-if="statsStatus == 'pending'" class="p-4">
    <Icon name="i-lucide-loader-circle" class="animate-spin align-middle mb-1" />
    Loading statistics...
  </div>
  <div v-else-if="statsError" class="p-4">
    <UAlert color="error" title="Unable to get player statistics" :description="statsError.message" />
  </div>
  <div v-else class="p-4">
    <em>Stats unavailable</em>
  </div>
</template>

<script setup lang="ts">
import { formatDate, getRelDate } from "@srcpanel/common/format";
import type { StatsAPI_UserDetails } from "@srcpanel/common/Stats";

const props = defineProps<{
  steamid: string;
}>();

const { data: stats, status: statsStatus, execute: fetchStats, error: statsError } = useLazyFetch<StatsAPI_UserDetails>(() => `https://stats.jackz.me/api/users/${props.steamid}`);

const playtime = computed(() => {
  if (!stats.value) return null;
  if (stats.value.seconds_total < 60) return "< min";
  const mins = stats.value.seconds_total / 60;
  if (mins < 60) return `${Math.round(mins)} mins`;
  const hours = mins / 60;
  return `${Math.round(hours).toLocaleString()} hours`;
});

onMounted(() => {
  fetchStats();
});
</script>
