<template>
  <div>
    <Hero title="Audit Logs" />
    <UContainer class="fluid grid grid-cols-4 gap-4">
      <div class="col-span-3">
        <a @click="fetchMore" class="cursor-pointer">
          <UAlert class="bg-light-blue text-black dark:text-white my-3 py-5 rounded-2xl" icon="lucide:info">
            <template #description>
              <b>20</b> new entries are available. Click here to load
            </template>
          </UAlert>
        </a>
        <template v-if="logData && status == 'success'">
          <AuditTable v-if="logData.logs.length > 0" :entries="logData.logs" @find-nearby="findNearby" />
          <UCard v-else variant="subtle">
            <div class="p-6 text-center">
              <h3 class="text-xl font-bold">
                No entries found
              </h3>
              <p class="text-md">
                Adjust the filters and search options,
                <br />or change the data source that's selected
              </p>
              <br />
              <div class="text-center">
                <USelect v-model="dataSource" :items="dataSources" :loading="!dataSources" class="w-30" />
              </div>
            </div>
          </UCard>
        </template>
        <UAlert v-else-if="status == 'error'" color="error" title="Error fetching logs" :description="error?.message" />
        <UCard v-else>
          <div class="m-6 p-6 text-center">
            <h3 class="text-xl font-bold">
              <Icon name="i-lucide-loader-circle" class="animate-spin align-middle mb-1" />
              Loading logs...
            </h3>
            <p class="text-lg">This could take a few moments</p>
            <br />
            <p class="text-lg">{{ fetchTimeElapsed }}</p>
          </div>
        </UCard>
      </div>
      <div>
        <UCard>
          <div class="space-y-2">
            <h3 class="text-lg py-2">{{ logData?.counts.queryRows  }} / <span class="font-bold">{{ (logData?.yearInfo?.count || 0).toLocaleString() }} entries</span></h3>
            <UFormField label="Search Client" :ui="{ label: 'font-semibold' }">
              <UInputMenu v-model="searchClient" v-model:search-term="searchUser" @input="() => searchUserExecuteDebounce()" ignore-filter type="text" leading-icon="lucide:user" placeholder="Search for player name or steamid" class="w-full"
                :items="searchUserItems" clear value-key="value" autocomplete="autocomplete" />
            </UFormField>
            <UFormField label="Search Target" :ui="{ label: 'font-semibold' }">
              <UInputMenu v-model="searchTarget" v-model:search-term="searchUser" @input="() => searchUserExecuteDebounce()" ignore-filter type="text" leading-icon="lucide:user" placeholder="Search for player name or steamid" class="w-full"
                :items="searchTargetItems" clear value-key="value" autocomplete="autocomplete" />
            </UFormField>
            <UFormField label="Search Message" :ui="{ label: 'font-semibold' }">
              <UInput v-model="searchMessage" type="text" leading-icon="lucide:search" placeholder="Search by message content" class="w-full" />
            </UFormField>
            <UFormField label="Enabled Types" :ui="{ label: 'font-semibold' }">
              <USelectMenu v-model="selectedTypes" class="w-full" multiple :items="TYPES" />
            </UFormField>
            <UFormField label="Enabled Sources" :ui="{ label: 'font-semibold' }">
              <USelectMenu v-model="selectedSources" :loading="!data" :items="data?.servers" class="w-full" :disabled="!data" multiple />
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
              <UButton @click="refresh()" leading-icon="lucide:refresh-cw" :loading="status == 'pending'" size="lg" class="w-full">Refresh</UButton>
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
useHead({
  title: "Audit Logs"
})
import Hero from '@/components/Hero.vue';
import AuditTable from '@/components/audit/AuditTable.vue'
import { TYPE_MAP, type APILogData, type APILogQueryResult, type LogEntry } from '@common/Logs';
import type { APIListPlayersResponse } from '@common/User';
import debounce from '@common/methods/debounce';
import { type InputMenuItem, type SelectItem } from '@nuxt/ui';

const TYPES: SelectItem[] = Object.entries(TYPE_MAP).map(([id, data]) => {
  id = id.toLocaleLowerCase()
  return {
    label: id.charAt(0).toUpperCase() + id.slice(1),
    icon: data.icon,
    value: id
  }
})

const route = useRoute()
const router = useRouter()

const { data } = await useFetch<APILogData>("/api/logs/data", { key: "logs-data" })

const query = computed(() => {
  const params = new URLSearchParams()
  params.append("limit", limit.value.toString())
  params.append("source", dataSource.value.toString())
  if(selectedSources.value.length > 0) params.append("servers", selectedSources.value.join(','))
  if(selectedTypes.value.length > 0) params.append("types", selectedTypes.value.join(','))
  if(searchClient.value) params.append('search_client', searchClient.value)
  if(searchTarget.value) params.append('search_target', searchTarget.value)
  if(searchMessage.value) params.append('search_message', searchMessage.value)
  return params
})

const dataSources = computed(() => data.value ? Object.keys(data.value?.years) : undefined)

const id = ref<number>(route.query.id ? parseInt(route.query.id as string) : 1)
const aroundId = ref<number|undefined>(route.query.aroundId ? parseInt(route.query.aroundId as string) : undefined)
const limit = ref<number>(route.query.limit ? parseInt(route.query.limit as string) : 30)
const dataSource = ref<string>(route.query.source as string || new Date().getFullYear().toString())
const order = ref<string>(aroundId.value ? "around" : route.query.dir as string || 'after')
const selectedTypes = ref<string[]>(route.query.types ? (route.query.types as string).split(',') : ["action","chat","state","quit","join","info"])
const selectedSources = ref<string[]>(route.query.servers ? (route.query.servers as string).split(',') : (data.value?.servers ?? []))
const searchClient = ref<string|undefined>(route.query.client as string)
const searchTarget = ref<string|undefined>(route.query.target as string)
const searchMessage = ref<string|undefined>(route.query.msg as string)

const searchUser = ref<string>("")

const fetchTimeElapsed = computed(() => {
  if(!startLoadingTime.value) return "-"
  let diff = now.value - startLoadingTime.value
  if(diff < 0) diff = 0.0
  return (diff / 1000).toFixed(1) + "s"
})

const now = ref<number>(Date.now())
const startLoadingTime = ref<number|undefined>()

const api = useApi()

const { data: logData, refresh, execute, status, error } = useLazyAsyncData<APILogQueryResult>(
  () => 'logs?' + query.value.toString(),
  async() => {
    console.debug('fetching')
    startLoadingTime.value = Date.now()
    const val: APILogQueryResult = await api(`/logs/${order.value}/${id.value}?${query.value.toString()}`)
    startLoadingTime.value = undefined
    return val
  }
)

function searchUserTransform(res: APIListPlayersResponse & { value: string }): InputMenuItem[] {
  return res.users.map(user => {
    return {
      label: user.name ?? user.steamid,
      description: user.steamid + (user.isAdmin ? ` - Admin` : ''),
      value: user.steamid
    }
  })
}

const { data: searchUserItems, execute: searchUserExecute } = useLazyFetch(() => `/api/users/search?query=${searchUser.value}`, { transform: searchUserTransform, immediate: false })
const searchUserExecuteDebounce = debounce(searchUserExecute, 400)

// If user hasn't specified an id, switch them to the current highest ID of selected data source, if any
watch(() => data.value, () => {
  if(data.value && !route.query.id) {
    const yearData = data.value.years[dataSource.value]
    if(yearData) {
      id.value = yearData.maxId - limit.value
    }
  }
}, { immediate: true })

const updateUrlDebounced = debounce(updateUrl, 800)

function updateUrl() {
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      id: id.value,
      limit: limit.value,
      source: dataSource.value,
      order: order.value,
      types: selectedTypes.value.join(','),
      servers: selectedSources.value.join(','),
      client: searchClient.value,
      target: searchTarget.value,
      msg: searchMessage.value
    }
  })
}

watch([ id, limit, dataSource, order, selectedTypes, selectedSources, searchClient, searchTarget, searchMessage ], () => {
  updateUrlDebounced()
})

watch(() => route.query, () => execute())

// const { data: logData, refresh, status, error } = useFetch<APILogQueryResult>(() => `/api/logs/after/${id.value}?${query.value.toString()}`, { lazy: true, immediate: false })

function findNearby(jumpId: number) {
  order.value = 'around'
  id.value = jumpId
}

async function fetchMore() {

}

function setQuery(key: string, value: any) {
  // router.replace({ path: route.path, query: { ...route.query, [key]: value } });
}
onMounted(() => {
  // update now.value every second, so it updates fetchTimeElapsed properly
  setInterval(() => now.value = Date.now(), 100)
})
</script>
