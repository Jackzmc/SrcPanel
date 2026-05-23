<template>
  <UCard :ui="{ body: 'p-2 md:p-2'}">
    <template #header>
      <h3 class="text-lg font-bold">Recent Activity</h3>
    </template>
    <div v-if="data">
      <div v-for="entry in data" :key="entry.id">
        <div>{{ entry.id }}</div>
      </div>
      <UCard v-if="data.length == 0" class="bg-light-blue">
        No recent activity has been recorded
      </UCard>
    </div>
    <UCard v-if="isUnsupported"
      class="bg-sky-300 dark:bg-sky-500 my-1 mx-2 text-sm"
      :ui="{ body: 'p-4 md:p-4' }"
    >
      Server does not support or is not configured for activity logs
    </UCard>
    <UAlert v-else-if="error" color="error"
      title="Unable to retrieve activities"
      :description="errorMessage"
    />
    <div class="mx-4">
      <IconText leading-icon="lucide:loader-circle" leading-icon-class="animate-spin" text="Loading entries"></IconText>
    </div>
  </UCard>
</template>

<script setup lang="ts">

const REFRESH_INTERVAL_MS = 1000 * 60 * 5

const props = defineProps<{
  serverId: string
}>()
import { type LogEntry } from '@jzpanel/common/Logs'
const { data, error, refresh } = await useLazyFetch<LogEntry[]>(
  `/api/servers/${props.serverId}/activities`,
  { key: 'servers.' + props.serverId + '.activities', immediate: true, server: false }
)

const isUnsupported = computed(() => {
  if(error.value) {
    const cause = error.value.cause as any
    if(cause) {
      if('data' in cause) {
        if(cause.data.error == "SERVER_LACKS_ACTIVITY") {
          return true
        }
      }
    }
  }
  return false
})

const errorMessage = computed(() => {
  if(!error.value) return
  const cause = error.value.cause as any
  if(cause) {
    if('data' in cause) {
     return cause.data.error + ": " + cause.data.message
    }
  }
})

let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => refresh(), REFRESH_INTERVAL_MS)
})

onUnmounted(() => {
  clearInterval(timer)
})

// TODO: auto refresh
</script>
