<template>
  <div class="space-y-3">
    <UCard class="shadow-md">
      <div class="flex justify-between items-end">
        <div class="flex items-end gap-2 align-bottom">
          <UFormField label="Server">
            <USelectMenu v-model="server" :items="servers"  class="w-48" />
          </UFormField>
          <UButton @click="refresh()" leading-icon="lucide:refresh-ccw" size="md">
            Refresh
          </UButton>
        </div>
        <div>
          <div>
            <div v-if="status === 'pending'" class="text-right">
              <Icon name="lucide:refresh-ccw" class="animate-spin" />
              Refreshing
            </div>
            <h3 class="font-semibold text-md">Refreshing every {{ Math.round(AUTO_REFRESH_INTERVAL / 1000) }} seconds</h3>
          </div>
        </div>
      </div>
    </UCard>

    <UTable
      v-if="data"
      :data="data.users"
      :columns="columns"
      class="shadow-lg"
      :ui="{
        base: 'border border-default',
        td: 'text-black dark:text-white',
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { UserComponent } from '#components'
import { getRelDate } from '@common/methods/format'
import type { APIRecentUsersResponse, PlayerEntry } from '@common/User'
import type { SelectItem, TableColumn } from '@nuxt/ui'

const AUTO_REFRESH_INTERVAL = 1000 * 60

useHead({
  title: "Recent - Players"
})
const servers = ref<SelectItem[]>([
  {
    label: "All Servers",
    value: "",
  }
])
const server = ref<SelectItem>(servers.value[0] as SelectItem)

const { data, refresh, status } = await useFetch<APIRecentUsersResponse>(() => `/api/users/recent?server=${server.value!.value}`, { key: "players.recent" })

const columns = computed(() => {
  const columns: TableColumn<PlayerEntry>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({row}) => h(UserComponent, {
        user: {
          steamid: row.original.steamid,
          name: row.original.name,
        },
        class: "text-primary font-bold"
      }),
    },
    {
      accessorKey: "country",
      header: "Country",
    },
    {
      accessorKey: "bansCount",
      header: "Bans",
      cell: ({row}) => h("span", { class: row.original.bansCount == 0 && "text-neutral-600/25" }, row.original.bansCount),
    },
    {
      accessorKey: "notesCount",
      header: "Notes",
      cell: ({row}) => h("span", { class: row.original.notesCount == 0 && "text-neutral-600/25" }, row.original.notesCount),
    },
    {
      accessorKey: "firstJoinDate",
      header: "First Join",
      cell: ({row}) => new Date(row.original.firstJoinDate).toLocaleString(),
    },
    {
      accessorKey: "lastJoinDate",
      header: "Last Join",
      cell: ({row}) => getRelDate(row.original.lastJoinDate),
    }
  ]
  // Hide server if we selected a server
  if(server.value!.value === "") {
    columns.push({
      accessorKey: "server",
      header: "Server",
    },)
  }
  return columns
})
onMounted(() => {
  setInterval(() => refresh(), AUTO_REFRESH_INTERVAL)
})
</script>
