<template>
  <div class="space-y-3">
    <UCard class="shadow-md">
      <div class="flex justify-between items-end">
        <div class="flex items-end gap-2 align-bottom">
          <UFormField label="Search by name or Steam ID" :ui="{ label: 'font-bold' }">
            <UInput v-model="query" placeholder="STEAM_#:#:####### or name of player" class="w-100" size="lg" />
          </UFormField>
        </div>
        <div>
        </div>
      </div>
    </UCard>

    <div v-if="error">
      <UAlert type="error" color="error" title="Error occurred" :description="error.message" />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ItemSplitter v-if="data" :items-per-column="10" :data="data.admins" v-slot="slotProps">
        <div class="overflow-x-auto min-w-0">
          <UTable
            :data="slotProps.data"
            :columns="columns"
            class="shadow-lg"
            :ui="{
              base: 'border border-default',
              td: 'text-black dark:text-white py-1 px-1',
              th: 'py-1 px-2',
            }"
          />
        </div>
      </ItemSplitter>
    </div>

  </div>
</template>

<script setup lang="ts">
import { UserComponent } from '#components'
import type { APIListAdmins, ReadableAdminData } from '@common/User'
import type { TableColumn } from '@nuxt/ui'

const query = ref<string>("")

const { data, error, status } = await useFetch<APIListAdmins>('/api/admins', { key: "players.admins" })

const columns: TableColumn<ReadableAdminData>[] = [
  {
    accessorKey: 'id',
    header: "Id"
  },
  {
    accessorKey: 'name',
    header: "Name",
    cell: ({row}) => h(UserComponent, {
      user: {
        steamid: row.original.steamid,
        name: row.original.name,
      },
      class: "text-primary font-bold text-xs"
    }),
  },
  {
    accessorKey: 'steamid',
    header: "Steam ID",
    meta: {
      class: {
        td: "text-xs"
      }
    }
  }
]
</script>
