<template>
  <div>
    <UTable :data="data.names" :columns="namesColumns" class="w-full" />
  </div>
</template>

<script setup lang="ts">
import { formatDate, getRelDate } from '@common/methods/format';
import type { APIUserDetails, UserNameEntry } from '@common/User'
import type { TableColumn } from '@nuxt/ui';

defineProps<{
  steamid: string
  data: APIUserDetails
}>()

const namesColumns: TableColumn<UserNameEntry>[] = [
  {
    accessorKey: 'name',
    header: "Name",
    meta: {
      class: {
        td: "font-semibold"
      }
    }
  },
  {
    accessorKey: 'timestamp',
    header: 'Date Recorded',
    cell: ({row}) => h("div", { class: "flex justify-start gap-4 items-end" }, [
      h("div", formatDate(row.original.timestamp)),
      h("div", { class: "text-muted text-xs" }, getRelDate(row.original.timestamp))
    ])
  }
]
</script>
