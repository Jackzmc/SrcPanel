<template>
  <div>
    <Hero title="Manage Servers" />
    <UContainer>
      <UAlert v-if="error" :message="error.message" type="error" />
      <UCard>
        <div class="flex justify-between">
          <div class="flex gap-2 items-center">
            <UInput v-model="search" placeholder="Search" leading-icon="lucide:search" class="w-64" />
            <span>{{ filteredServers.length }} servers</span>
          </div>
          <div class="flex gap-2">
            <UButton leading-icon="lucide:refresh-ccw" variant="outline" color="neutral" @click="refresh()"></UButton>
            <UButton leading-icon="lucide:plus" @click="startNewServerModal()">Start New Server</UButton>
            <UButton leading-icon="lucide:circle-question-mark" variant="outline" color="neutral" @click="openHelpModal()">Help</UButton>
          </div>
        </div>
        <UTable :data="filteredServers" :columns="columns"
          ref="table"
          checkable
          :loading="status === 'pending'"
          sticky="header"
        />
      </UCard>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { IconText, UBadge, UCheckbox, ULink, UTooltip } from '#components';
import Hero from '@/components/Hero.vue';
import { type APIListServersV2, type APIListServersV2_Server } from '@common/Server';
import type { TableColumn } from '@nuxt/ui';
import { sortHeader } from '#imports';
import ActionButton from '~/components/servers/ActionButton.vue';

useHead({
  title: "Manage Servers"
})

interface UIServer extends APIListServersV2_Server {
  statusClass?: string
}

const { requireAuth } = useAuth();

await requireAuth();

const { data, status, error, refresh } = await useFetch<APIListServersV2>('/api/servers/v2', { key: "servers_v2" });

const filteredServers = computed<UIServer[]>(() => {
  if(!data.value) return []
  if(search.value == "") return data.value.servers.map(transform)
  const lowerSearch = search.value.toLowerCase()
  return data.value.servers
    .filter(server => server.name.toLowerCase().includes(lowerSearch)
      || server.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
      || server.groupId.toLowerCase().includes(lowerSearch)
      || (data.value!.groups[server.groupId] && data.value!.groups[server.groupId]!.name.toLowerCase().includes(lowerSearch))
    )
    .map(transform)
})

function transform(server: APIListServersV2_Server): UIServer {
  let statusClass
  if(server.online) {
    statusClass = (server.status.data && server.status.data?.players.length > 0) ? 'text-primary' : 'text-success'
  } else {
    statusClass = 'text-error'
  }
  return {
    ...server,
    statusClass
  }
}

const columns: TableColumn<UIServer>[] = [
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
         class: ['font-bold text-lg flex-col', row.original.statusClass]
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
    cell: ({ row }) => h("div", { class: "flex gap-4" }, row.original.tags.map(tag => h(UBadge, { size: "sm", color: "neutral", variant: "outline" }, () => tag))),
    header: "Tags"
  },
  {
    id: 'state',
    header: sortHeader("State"),
    cell: ({ row }) => h("div", { class: "flex-col" }, [
      h("div",
        { class: row.original.statusClass },
        h(IconText,
          {
            'leading-icon': row.original.online ? 'lucide-circle' : 'lucide-square',
            text: row.original.online ? "Online" : "Offline",
          },
          () => null
        )
      ),
      h("div",
        { class: (row.original.status.data && row.original.status.data.players.length > 0 ? 'font-semibold' : '') },
        (row.original.status.data) ? `${row.original.status.data.players.length} players online` : '',
      )
    ]),
  },
  {
    header: "Actions",
    cell: ({ row }) => h("div",
      { class: "flex gap-2 flex-wrap" },
      row.original.actions
        .filter(action => action.inQuickAction)
        .map(action => h(ActionButton, { serverId: row.original.id, action: action }))
    ),
  }
]

const search = ref("")

function startNewServerModal() {

}

function openHelpModal() {

}
</script>
