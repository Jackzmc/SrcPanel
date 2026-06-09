<template>
  <PlayersPage
    :players="data?.users"
    :loading="status === 'pending'"
    :error="error"
  >
   <template #bar-left>
    <UFormField label="Search by name or Steam ID" :ui="{ label: 'font-bold' }">
      <UInput v-model="query" placeholder="STEAM_#:#:####### or name of player" class="w-100" size="lg" @input="searchDebounce" />
    </UFormField>
    <UButton leading-icon="lucide:refresh-ccw" size="md" :loading="status == 'pending'" @click="search()">
      Refresh
    </UButton>
   </template>
  </PlayersPage>
</template>

<script setup lang="ts">
import type { APIListPlayersResponse } from '@jzpanel/common/User'
import PlayersPage from '@/components/players/PlayersPage.vue'
import { debounce } from '@jzpanel/common/util'

const route = useRoute()

useHead({
  title: "Search - Players"
})
const query = ref<string|undefined>(route.query.query as string)

const { data, refresh, status, error, clear } = useFetch<APIListPlayersResponse>(() => `/api/users/search?query=${query.value}`, { immediate: false, lazy: true, cache: "no-cache", server: false })

function search() {
  if(query.value != "") refresh()
  else clear()
}

const searchDebounce = debounce(search, 400)

onMounted(() => {
  if(query.value) {
    search()
  }
})
</script>
