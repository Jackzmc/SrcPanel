<template>
  <div>
    <Hero title="Audit Logs" />
    <UContainer class="fluid grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div class="col-span-3">
        <!-- TODO: check periodically for entries -->
        <!-- <pre>{{ JSON.stringify({
            dataRange,
            dataSource,
            currentSource,
            order,
            id
          }, null, 2) }}</pre> -->
        <!-- Top Loading -->
        <ClientOnly>
          <template v-if="logData && logData.logs.length > 0 && newerEntries > 0">
            <UAlert v-if="loadingSide == 'top'" class="bg-light-blue text-black dark:text-white my-3 py-5 rounded-2xl">
              <template #description>
                <h3 class="text-xl font-bold">
                  <Icon name="i-lucide-loader-circle" class="animate-spin align-middle mb-1" />
                  Fetching more entries...
                </h3>
              </template>
            </UAlert>
            <a v-else class="cursor-pointer" @click="fetchDirection('top')">
              <UAlert v-if="newerEntries > 0" class="bg-light-blue text-black dark:text-white my-3 py-5 rounded-2xl" icon="lucide:info">
                <template #description>
                  <b>{{ newerEntries.toLocaleString() }}</b> new entries are available. Click here to load.
                  <p class="text-xs text-muted">Please note the new entry detection currently ignores filters and may be inaccurate</p>
                </template>
              </UAlert>
            </a>
          </template>
        </ClientOnly>
        <!-- Main -->
        <template v-if="logData">
          <!-- <b>id</b> {{ id }} <b>order</b> {{ order }} <b>current</b> {{ dataRange}} - <b>available</b> { lowest: {{ currentSource?.minId }}, highest: {{ currentSource?.maxId }} } -->
          <AuditTable v-if="logData.logs.length > 0" :entries="logData.logs" @find-nearby="findNearby" />
          <UCard v-else variant="subtle">
            <div class="p-6 text-center">
              <h3 class="text-xl font-bold">
                No entries found
              </h3>
              <p class="text-md">
                Adjust the filters and search options,
                <br>or change the data source that's selected
              </p>
              <br>
              <div class="text-center">
                <USelect v-model="dataSource" :items="dataSources" :loading="!dataSources" class="w-30" />
              </div>
            </div>
          </UCard>
        </template>
        <UAlert v-if="error" color="error" title="Error fetching logs" :description="error?.message" class="mb-4" />
        <UCard v-if="!logData" class="bg-light-blue">
          <div class="m-6 p-6 text-center">
            <h3 class="text-xl font-bold">
              <Icon name="i-lucide-loader-circle" class="animate-spin align-middle mb-1" />
              Loading logs...
            </h3>
            <p class="text-lg">
              This could take a few moments
            </p>
            <ClientOnly>
              <br>
              <p class="text-lg">
                {{ fetchTimeElapsed }}
              </p>
            </ClientOnly>
          </div>
        </UCard>

        <!-- Bottom Loader -->
        <ClientOnly>
          <template v-if="logData">
            <UCard v-if="loadingSide == 'bottom'" class="bg-light-blue my-6">
              <div class="text-center p-3">
                <h3 class="text-xl font-bold">
                  <Icon name="i-lucide-loader-circle" class="animate-spin align-middle mb-1" />
                  Fetching more entries...
                </h3>
              </div>
            </UCard>
            <UCard v-else class="bg-light-blue my-6">
              <div class="text-center p-3">
                <UButton size="xl" variant="outline" color="neutral" @click="fetchDirection('bottom')">
                  Fetch more
                </UButton>
              </div>
            </UCard>
          </template>
        </ClientOnly>
      </div>
      <div>
        <UCard>
          <div class="space-y-2">
            <h3 class="text-lg py-2">
              {{ logData?.counts.queryRows }} / <span class="font-bold">{{ (logData?.yearInfo?.count || 0).toLocaleString() }} entries</span>
            </h3>
            <UFormField label="Search Client" :ui="{ label: 'font-semibold' }">
              <UInputMenu
                v-model="searchClient"
                v-model:search-term="searchUser"
                ignore-filter
                type="text"
                leading-icon="lucide:user"
                placeholder="Search for player name or steamid"
                class="w-full"
                :items="searchUserItems"
                clear
                value-key="value"
                autocomplete
                @input="() => searchUserExecuteDebounce()"
              />
            </UFormField>
            <UFormField label="Search Target" :ui="{ label: 'font-semibold' }">
              <UInputMenu
                v-model="searchTarget"
                v-model:search-term="searchUser"
                ignore-filter
                type="text"
                leading-icon="lucide:user"
                placeholder="Search for player name or steamid"
                class="w-full"
                :items="searchUserItems"
                clear
                value-key="value"
                autocomplete
                @input="() => searchUserExecuteDebounce()"
              />
            </UFormField>
            <UFormField label="Search Message" :ui="{ label: 'font-semibold' }">
              <UInput v-model="searchMessage" type="text" leading-icon="lucide:search" placeholder="Search by message content" class="w-full" />
            </UFormField>
            <UFormField label="Enabled Types" :ui="{ label: 'font-semibold' }">
              <USelectMenu v-model="selectedTypes" class="w-full" multiple :items="TYPES" />
            </UFormField>
            <UFormField label="Enabled Sources" :ui="{ label: 'font-semibold' }">
              <USelectMenu
                v-model="selectedSources"
                :loading="!data"
                :items="data?.servers"
                class="w-full"
                :disabled="!data"
                multiple
              />
            </UFormField>
            <div class="flex justify-between gap-2">
              <UFormField label="Around Id" :ui="{ label: 'font-semibold' }">
                <UInput v-model="aroundId" type="number" placeholder="####" />
              </UFormField>
              <UFormField label="Data Year" :ui="{ label: 'font-semibold' }">
                <USelect v-model="dataSource" :items="dataSources" :loading="!dataSources" class="w-30" />
              </UFormField>
            </div>
            <UFormField class="mt-4">
              <UButton leading-icon="lucide:refresh-cw" :loading="!isClient || status == 'pending'" size="lg" class="w-full" @click="refresh()">
                Refresh
              </UButton>
            </UFormField>
          </div>
        </UCard>
        <div class="text-sm mx-2 mt-1 text-center space-y-1">
          <p>Took <b>{{ logData ? logData.timeTaken.toLocaleString() + ' ms' : fetchTimeElapsed }}</b> to fetch</p>
          <p>
            <b v-if="logData">{{ logData?.yearInfo?.count?.toLocaleString() }}</b>
            <Icon v-else name="i-lucide-loader-circle" class="animate-spin align-middle mb-1" size="xs" />
            entries this year,
          </p>
          <p>
            <b v-if="data">{{ data?.computedTotal?.toLocaleString() }}</b>
            <Icon v-else name="i-lucide-loader-circle" class="animate-spin align-middle mb-1" size="xs" />
            entries total
          </p>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import Hero from "@/components/Hero.vue";
import AuditTable from "@/components/audit/AuditTable.vue";
import type { APILogData, APILogQueryResult, LogEntry } from "@jzpanel/common/Logs";
import { TYPE_MAP } from "#shared/types/logs";
import type { APIListPlayersResponse } from "@jzpanel/common/User";
import { debounce } from "@jzpanel/common/util";
import type { InputMenuItem, SelectItem } from "@nuxt/ui";

useHead({
  title: "Audit Logs",
});

const toast = useToast();
/// How often to check for new entries
const REFRESH_INTERVAL = 1000 * 60 * 5;
/// Maximum amount to keep in buffer, entries in opposite direction removed
const MAX_ENTRIES_IN_BUFFER = 50;

const TYPES: SelectItem[] = Object.entries(TYPE_MAP).map(([id, data]) => {
  id = id.toLocaleLowerCase();
  return {
    label: id.charAt(0).toUpperCase() + id.slice(1),
    icon: data.icon,
    value: id,
  };
});

const isClient = import.meta.client;

const route = useRoute();
const router = useRouter();

const { data, refresh: refreshMetaData } = await useFetch<APILogData>("/api/logs/data", { key: "logs-data" });

const query = computed(() => {
  const params = new URLSearchParams();
  params.append("limit", limit.value.toString());
  params.append("source", dataSource.value.toString());
  if (selectedSources.value.length > 0) params.append("servers", selectedSources.value.join(","));
  if (selectedTypes.value.length > 0) params.append("types", selectedTypes.value.join(","));
  if (searchClient.value) params.append("search_client", searchClient.value);
  if (searchTarget.value) params.append("search_target", searchTarget.value);
  if (searchMessage.value) params.append("search_message", searchMessage.value);
  return params;
});

const dataSources = computed(() => data.value ? Object.keys(data.value?.years) : undefined);

const currentSource = computed(() => {
  return data.value?.years[dataSource.value];
});

/* TODO: this needs replaced, because filters exist!
   - replace with custom check route that just returns count?
   - or just pre-fetch?
   - or add a ?count-only query to not actually grab logs (complicated)
 */
const newerEntries = computed(() => {
  if (!currentSource.value) return 0;
  return currentSource.value.maxId - dataRange.value.highest;
});

const dataRange = computed(() => {
  if (!logData.value) return { lowest: 0, highest: 0 };
  let lowest = Infinity, highest = 0;
  for (const entry of logData.value.logs) {
    lowest = Math.min(lowest, entry.id);
    highest = Math.max(highest, entry.id);
  }
  return { lowest, highest };
});

const loadingSide = ref<"bottom" | "top" | undefined>();
const order = ref<"before" | "after" | "around">("before");

// Query parameters
const limit = ref<number>(route.query.limit ? parseInt(route.query.limit as string) : 10);
const aroundId = ref<number | undefined>(route.query.aroundId ? parseInt(route.query.aroundId as string) : undefined);
const dataSource = ref<string>(route.query.source as string || new Date().getFullYear().toString());
const selectedTypes = ref<string[]>(route.query.types ? (route.query.types as string).split(",") : ["action", "chat", "state", "quit", "join", "info"]);
const selectedSources = ref<string[]>(route.query.servers ? (route.query.servers as string).split(",") : (data.value?.servers ?? []));
const searchClient = ref<string | undefined>(route.query.client as string);
const searchTarget = ref<string | undefined>(route.query.target as string);
const searchMessage = ref<string | undefined>(route.query.msg as string);

const id = ref<number>(currentSource.value ? currentSource.value.maxId : 0);

const searchUser = ref<string>("");

const fetchTimeElapsed = computed(() => {
  if (!startLoadingTime.value) return "0.0s";
  let diff = now.value - startLoadingTime.value;
  if (diff < 0) diff = 0.0;
  return (diff / 1000).toFixed(1) + "s";
});

const now = ref<number>(Date.now());
const startLoadingTime = ref<number | undefined>();

const api = useApi();

const { data: logData, refresh, status, error } = useLazyAsyncData<APILogQueryResult>(
  () => `/logs/${order.value}/${id.value}?${query.value.toString()}`,
  async () => {
    console.debug("fetching", `order=${order.value} id=${id.value}`);
    // merge with prev result
    // avoid unnecessary sort by checking order.value for direction to push into
    startLoadingTime.value = Date.now();
    const queryUrl = `/logs/${order.value}/${id.value}?${query.value.toString()}`;
    console.debug("fetch url", queryUrl);
    const newLogs: APILogQueryResult = await api(queryUrl);

    console.debug(logData.value, newLogs);
    // fullLogEntries.value = fullLogEntries.value.concat(val.logs)
    // Small little optimization, append to either top or bottom of list depending on order
    console.debug("new results", newLogs.logs.length, "existing results", logData.value?.logs.length);
    newLogs.logs = mergeLogs(logData.value?.logs, newLogs.logs, order.value);
    requestAnimationFrame(() => {
      loadingSide.value = undefined;
    });
    startLoadingTime.value = undefined;

    return newLogs;
  },
  { server: false, timeout: 90_000, watch: undefined },
);

const logEntryIds = computed(() => {
  return new Set(
    logData.value?.logs.map(log => log.id),
  );
});

function mergeLogs(existingLogs: LogEntry[] = [], newLogs: LogEntry[], direction: string) {
  // If direction is 'around', we just push and sort anyway
  // Logs are descending order
  console.log("merge", existingLogs.map(l => l.id), newLogs.map(l => l.id));
  // Filter out any logs in newLogs that we already have
  const filteredNewLogs = newLogs.filter(log => !logEntryIds.value.has(log.id));
  console.log("filter", newLogs.map(l => l.id), filteredNewLogs.map(l => l.id));
  let buffer: LogEntry[];
  if (direction == "before") {
    // Loading new entries on bottom, so they are older, append to front of list
    buffer = [...existingLogs, ...filteredNewLogs];
  } else {
    buffer = [...filteredNewLogs, ...existingLogs];
  }
  console.log("buffer", buffer);

  // Keep under maximum
  // TODO: verify that we keep limit + 5 (buffer), so you see previous fetched entry + new
  if (buffer.length > MAX_ENTRIES_IN_BUFFER) {
    const toRemove = buffer.length - MAX_ENTRIES_IN_BUFFER;
    console.debug("removing", toRemove, "prelen=", buffer.length);
    if (order.value == "before") {
      buffer.splice(buffer.length - toRemove - 1, toRemove);
    } else {
      buffer.splice(0, toRemove);
    }
  }
  return buffer;
  // Re-sort descending, ideally nothing changes
  // return buffer.sort((a,b) => b.timestamp - a.timestamp)
}

function searchUserTransform(res: APIListPlayersResponse & { value: string }): InputMenuItem[] {
  return res.users.map(user => {
    return {
      label: user.name ?? user.steamid,
      description: user.steamid + (user.isAdmin ? ` - Admin` : ""),
      value: user.steamid,
    };
  });
}

const { data: searchUserItems, execute: searchUserExecute } = useLazyFetch(() => `/api/users/search?query=${searchUser.value}`, { transform: searchUserTransform, immediate: false });
const searchUserExecuteDebounce = debounce(searchUserExecute, 400);

// If user hasn't specified an id, switch them to the current highest ID of selected data source, if any
// watch(() => data.value, () => {
//   if(data.value && !route.query.id) {
//     const yearData = data.value.years[dataSource.value]
//     if(yearData) {
//       id.value = yearData.maxId - limit.value
//     }
//   }
// }, { immediate: true })

const updateUrlDebounced = debounce(updateUrl, 800);

function updateUrl() {
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      aroundId: aroundId.value,
      limit: limit.value,
      source: dataSource.value,
      types: selectedTypes.value.join(","),
      servers: selectedSources.value.join(","),
      client: searchClient.value,
      target: searchTarget.value,
      msg: searchMessage.value,
    },
  });
}

watch([limit, dataSource, selectedTypes, selectedSources, searchClient, searchTarget, searchMessage], () => {
  // clear()
  updateUrlDebounced();
});

// const { data: logData, refresh, status, error } = useFetch<APILogQueryResult>(() => `/api/logs/after/${id.value}?${query.value.toString()}`, { lazy: true, immediate: false })

function findNearby(jumpId: number) {
  order.value = "around";
  id.value = jumpId;
  refresh();
}

async function fetchDirection(dir: "top" | "bottom") {
  if (!currentSource.value) return toast.add({
    color: "error",
    title: "Unable to fetch more entries",
    description: "No data source was found",
  });

  console.debug("fetchDirection", dir);
  loadingSide.value = dir;
  id.value = (dir === "top") ? dataRange.value.highest : dataRange.value.lowest;
  order.value = (dir == "top") ? "after" : "before";
  console.log("t", id.value);
  refresh();
}

onMounted(() => {
  // update now.value every second, so it updates fetchTimeElapsed properly
  setInterval(() => now.value = Date.now(), 100);
  setInterval(() => {
    console.info("refreshing metadata");
    console.debug("prev range:", dataRange.value);
    refreshMetaData();
  }, REFRESH_INTERVAL);

  // Check if loading from server initially and trigger
  if (!data.value) refresh();
});
</script>
