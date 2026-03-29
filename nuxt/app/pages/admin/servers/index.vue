<template>
  <div>
    <Hero title="Manage Servers" />
    <UContainer>
      <UAlert v-if="error" :message="error.message" type="error" />
      <UTable v-else-if="data" :data="data.servers" :columns="columns"
        ref="table"
        checkable
        :loading="status === 'pending'"
        sticky="header"
      />
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { IconText, UBadge, UCheckbox, ULink, UTooltip } from '#components';
import Hero from '@/components/Hero.vue';
import { type APIListServersV2, type APIListServersV2_Server } from '@common/Server';
import type { TableColumn } from '@nuxt/ui';
import { sortHeader } from '#imports';

useHead({
  title: "Manage Servers"
})

const { data, status, error } = await useFetch<APIListServersV2>('/api/servers/v2', { key: "servers_v2" });

const columns: TableColumn<APIListServersV2_Server>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'aria-label': 'Select row'
      })
  },
  {
    accessorKey: 'name',
    cell: ({ row }) => h("div", [
      h(UTooltip,
       { text: row.original.id },
       () => h(ULink, {
         to: `/admin/servers/${row.original.groupId}/${row.original.id}`,
         class: ['font-bold text-lg flex-col', row.original.online ? 'text-success' : 'text-error']
       }, () => row.original.name ?? row.original.id),
      ),
      h("div", `${row.original.host}:${row.original.port}`),
    ]),
    header: sortHeader("Name"),
  },
  {
    accessorKey: 'groupId',
    cell: ({ row }) => h(UTooltip, {
      text: row.original.groupId,
    }, () => h(ULink, {
      class: 'text-primary',
      to: `/admin/servers/${row.original.groupId}`,
    }, () => data.value?.groups[row.original.groupId]?.name) ?? row.original.groupId),
    header: sortHeader("Group"),
  },
  {
    accessorKey: 'tags',
    cell: ({ row }) => h("div", { class: "flex gap-4" }, row.original.tags.map(tag => h(UBadge, { color: "neutral", variant: "outline" }, () => tag))),
    header: "Tags"
  },
  {
    id: 'state',
    header: sortHeader("State"),
    cell: ({ row }) => h("div", { class: "flex-col" }, [
      h("div",
        { class: row.original.online ? 'text-success' : 'text-error' },
        h(IconText,
          {
            'leading-icon': row.original.online ? 'lucide-circle' : 'lucide-square',
            text: row.original.online ? "Online" : "Offline",
          }
        )
      ),
      h("div",
        {},
        (row.original.status.data) ? `${row.original.status.data.players.length} players online` : '',
      )
    ]),
  },
  {
    header: "Actions",
    cell: ({ row }) => h("div", { class: "flex gap-4" }, row.original.actions.map(action => h("div", action))),
  }
]
</script>
