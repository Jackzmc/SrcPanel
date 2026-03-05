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
        <AuditTable v-if="logData && status == 'success'" :entries="logData.logs">

        </AuditTable>
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
              <UInput type="text" leading-icon="lucide:search" placeholder="Search for a client name or steamid" class="w-full" />
            </UFormField>
            <UFormField label="Search Target" :ui="{ label: 'font-semibold' }">
              <UInput type="text" leading-icon="lucide:search" placeholder="Search for a target name or steamid" class="w-full" />
            </UFormField>
            <UFormField label="Search Message" :ui="{ label: 'font-semibold' }">
              <UInput type="text" leading-icon="lucide:search" placeholder="Search by message content" class="w-full" />
            </UFormField>
            <UFormField label="Enabled Types" :ui="{ label: 'font-semibold' }">
              <USelectMenu class="w-full"></USelectMenu>
            </UFormField>
            <UFormField label="Enabled Sources" :ui="{ label: 'font-semibold' }">
              <USelectMenu :loading="!data" :items="data?.servers" class="w-full" :disabled="!data"></USelectMenu>
            </UFormField>
            <div class="flex justify-between gap-2">
              <UFormField label="Around Id" :ui="{ label: 'font-semibold' }">
                <UInput type="number" placeholder="####" />
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
import { type APILogData, type APILogQueryResult, type LogEntry } from '@common/Logs';


const route = useRoute()
const router = useRouter()

const { data } = useLazyFetch<APILogData>("/api/logs/data")

const query = computed(() => {
  const params = new URLSearchParams()
  params.append("limit", limit.value.toString())
  params.append("source", dataSource.value.toString())
  return params
  // for(const [filter, val] of Object.entries(filters.value)) {
  //   if(!val) continue
  //   if(Array.isArray(val)) {
  //     if(val.length > 0)
  //       searchParams.append(filter, val.join("+"))
  //   } else {
  //     searchParams.append(`search_${filter}`, val)
  //   }
  // }
  // if(route.query.raw) searchParams.append("raw", "1")
})

const dataSources = computed(() => data.value ? Object.keys(data.value?.years) : undefined)

const id = computed({
  get: () => route.query.id ? parseInt(route.query.id as string) : 1,
  set: (id: number) => setQuery('id', id)
})
const limit = computed({
  get: () => route.query.limit ? parseInt(route.query.limit as string) : 30,
  set: (limit: number) => setQuery('limit', Math.min(Math.max(limit, 100), 10))
})
const dataSource = computed({
  get: (): string => route.query.source as string || new Date().getFullYear().toString(),
  set: (source: string) => setQuery('source', source)
})

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
    startLoadingTime.value = Date.now()
    const val: APILogQueryResult = await api(`/logs/after/${id.value}?${query.value.toString()}`)
    startLoadingTime.value = undefined
    return val
  }
)

// If user hasn't specified an id, switch them to the current highest ID of selected data source, if any
watch(() => data.value, () => {
  if(data.value && !route.query.id) {
    const yearData = data.value.years[dataSource.value]
    if(yearData) {
      id.value = yearData.maxId - limit.value
    }
  }
}, { immediate: true })

// const { data: logData, refresh, status, error } = useFetch<APILogQueryResult>(() => `/api/logs/after/${id.value}?${query.value.toString()}`, { lazy: true, immediate: false })

async function fetchMore() {

}

function setQuery(key: string, value: any) {
  router.replace({ path: route.path, query: { ...route.query, [key]: value } });
}
onMounted(() => {
  // update now.value every second, so it updates fetchTimeElapsed properly
  setInterval(() => now.value = Date.now(), 100)
})
</script>
