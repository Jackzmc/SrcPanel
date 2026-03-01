<template>
  <PlayersPage
    :players="data?.users"
    :loading="status === 'pending'"
    :error="error"
    :show-server-column="server.value === ''"
  >
  <template #bar-left>
    <UFormField label="Recently played on" :ui="{ label: 'font-bold' }">
      <USelectMenu v-model="server" :items="servers"  class="w-48" />
    </UFormField>
    <UButton @click="refresh()" leading-icon="lucide:refresh-ccw" size="md" :loading="status == 'pending'">
      Refresh
    </UButton>
  </template>
  <template #bar-right>
    <h3 class="font-semibold text-md">Refreshing every {{ Math.round(AUTO_REFRESH_INTERVAL / 1000) }} seconds</h3>
  </template>
  </PlayersPage>
</template>

<script setup lang="ts">
import type { APIListPlayersResponse, PlayerRecentEntry } from '@common/User'
import type { APILogData } from '@common/Logs'
import type { SelectItem } from '@nuxt/ui'

const AUTO_REFRESH_INTERVAL = 1000 * 60

useHead({
  title: "Recent - Players"
})
const { data: serverIds } = await useFetch("/api/logs/data", {
  key: "logs.data",
  transform: (res: APILogData) => res.servers
    .filter((s: string) => s !== "web" && s !== "unknown")
})

const servers = computed<SelectItem[]>(() => {
  return [
    {
      label: "All Servers",
      value: "",
    },
    ...(serverIds.value ?? []).map((s: string) => ({ label: s, value: s })),
  ]
})
const server = ref<{ label: string; value: string }>(servers.value[0] as { label: string, value: string })

const { data, refresh, status, error, execute } = await useFetch<APIListPlayersResponse<PlayerRecentEntry>>(() => `/api/users/recent/${server.value!.value}`, { key: "players.recent" })

watch(server, () => execute())

onMounted(() => {
  setInterval(() => refresh(), AUTO_REFRESH_INTERVAL)
})
</script>
