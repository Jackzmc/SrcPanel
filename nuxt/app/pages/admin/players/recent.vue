<template>
  <div>
    <UCard>
      <div class="flex items-end gap-2 align-bottom">
        <UFormField label="Server">
          <USelectMenu v-model="server" :items="servers"  class="w-48" />
        </UFormField>
        <UButton @click="refresh()" leading-icon="lucide:refresh-ccw" size="md">
          Refresh
        </UButton>
      </div>
    </UCard>

    <UTable v-if="data" :data="data.users" :columns="columns" />
  </div>
</template>

<script setup lang="ts">
import { UserComponent } from '#components'
import { getRelDate } from '@common/methods/format'
import type { APIRecentUsersResponse, PlayerEntry } from '@common/User'
import type { SelectItem, TableColumn } from '@nuxt/ui'

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

const { data, refresh } = await useFetch<APIRecentUsersResponse>(() => `/api/users/recent?server=${server.value!.value}`, { key: "players.recent" })

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
  },
  {
    accessorKey: "notesCount",
    header: "Notes",
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
  },
  {
    accessorKey: "server",
    header: "Server",
  },
]
</script>
