<template>
  <div>
    <Hero title="Bans" subtitle="" />
    <UContainer class="fluid">
      <div class="grid grid-cols-0 sm:grid-cols-5 gap-2">
        <div class="col-span-4 order-2 sm:order-1">
          <div class="flex justify-left px-4 mb-3">
            <UPagination
              v-model:page="page"
              :items-per-page="limit"
              :total="data?.totalBans ?? 0"
            />
          </div>
          <UTable
            v-if="data"
            v-model:expanded="expanded"
            :data="data.bans"
            :columns="columns"
            :row-class="(row: ListAPIBan) => row.expires < Date.now() ? 'bg-red-500' : 'bg-green-500'"
            class="text-sm"
            :ui="{ td: 'p-0 py-1 px-0', th: 'py-1 px-0' }"
          >
            <template #expanded="{ row }">
              <div class="flex flex-col gap-1 px-2 py-2 text-md">
                <div v-if="row.original.publicReason">
                  <span class="font-semibold text-muted">Public Reason:</span>
                  <span class="ml-1">{{ row.original.publicReason }}</span>
                </div>
                <div>
                  <span class="font-semibold text-muted">Flags:</span>
                  <span v-if="row.original.flagList.length === 0" class="ml-1 font-mono">{{ row.original.flagList.join(', ') }}</span>
                  <span v-else class="ml-1 font-mono text-muted"><em>None</em></span>
                </div>
                <div>
                  <span class="font-semibold text-muted">Join Attempts:</span>
                  <span class="ml-1">{{ row.original.joinAttempts }}</span>
                </div>
              </div>
            </template>
          </UTable>
        </div>
        <div class="order-1 sm:order-2">
          <UCard class="bg-light-blue ">
            <h2 class="text-lg font-bold">
              Showing
              <UInput type="number" min="1" max="100" v-model.lazy="limit" />
              / {{ (data?.totalBans ?? 0).toLocaleString() }} bans
            </h2>
            <p>
              Click a user's name to view more detailed ban information
            </p>
            <div class="py-3">
              <UCheckbox v-model="showExpired" label="Show expired bans" size="xl" />
            </div>
          </UCard>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Bans',
  meta: [
    { name: "robots", content: "noindex,nosnippet" }
  ]
})
import type { TableColumn } from '@nuxt/ui'
import { APIBanFlags, type APIBanResponse, type ListAPIBan } from '@jzpanel/common/Ban'
import UCheckbox from '@nuxt/ui/components/Checkbox.vue'
import { formatDate, getRelDate } from '@jzpanel/common/format';

const api = useApi()
const route = useRoute()

const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')
const UBadge = resolveComponent('UBadge')

import UserComponent from '@/components/UserComponent.vue'

const columns: TableColumn<UIBan>[] = [
  {
    id: 'expand',
    cell: ({ row }) => h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      icon: 'i-lucide-chevron-down',
      square: true,
      'aria-label': 'Expand',
      ui: {
        leadingIcon: ['transition-transform', row.getIsExpanded() ? 'rotate-180' : '']
      },
      onClick: () => row.toggleExpanded()
    })
  },
  {
    accessorKey: 'client',
    header: "Client",
    cell: ({ row }) => h("div", { class: "min-w-[100px]" }, [
      h(UserComponent, { class: "text-primary font-bold truncate max-w-[140px]", user: row.original.client, hideAvatar: true }),
      h("div", { class: "text-muted text-xs truncate max-w-[140px]" }, row.original.client.id)
    ]),
  },
  {
    accessorKey: 'executor',
    header: "Banned By",
    cell: ({ row }) => h("div", { class: "min-w-[100px]" }, [
      h(UserComponent, { class: "text-primary font-bold truncate max-w-[140px]", user: row.original.executor, hideAvatar: true }),
      h("div", { class: "text-muted text-xs truncate max-w-[140px]" }, row.original.executor.id)
    ]),
  },
  {
    accessorKey: 'reason',
    header: "Reason",
    cell: ({ row }) => h("div", { class: "truncate max-w-[180px]", title: row.original.reason }, row.original.reason),
    meta: {
      class: {
        td: "whitespace-normal"
      }
    }
  },
  {
    accessorKey: 'flags',
    header: "Flags",
    cell: ({ row }) => h("div", { class: "flex gap-1 font-mono text-xs font-semibold" }, row.original.flagList.map(s => h(UTooltip, { text: s.text }, h(UBadge, s.symbol) )))
  },
  {
    accessorKey: 'joinAttempts',
    header: "Joins",
    cell: ({ row }) => h("span", { class: "text-xs" }, row.original.joinAttempts)
  },
  {
    accessorKey: 'expires',
    header: "Expires",
    cell: ({ row }) => row.original.expires
      ? h("span", { class: "text-xs font-semibold", title: new Date(row.original.expires*1000) }, formatDate(row.original.expires, true))
      : h("span", { class: "text-muted-600/25 text-xs" }, "Permanent")
  },
  {
    accessorKey: 'timestamp',
    header: "Date",
    cell: ({ row }) => h("div", [
      h("div", { class: "text-xs" }, getRelDate(row.original.timestamp)),
      h("div", { class: "text-muted text-xs" }, new Date(row.original.timestamp * 1000).toLocaleDateString()),
    ])
  },
]

const limit = ref(parseInt(route.query.limit as string) || 100)
const page = ref(parseInt(route.query.page as string) || 1)

const expanded = ref({})
const showExpired = ref(false)

interface UIBanResponse extends APIBanResponse {
  bans: UIBan[]
}
interface UIBan extends ListAPIBan {
  flagList: { symbol: string, text: string }[]
}

const { data, refresh } = await useAsyncData<UIBanResponse>(
  'bans',
  () => api(`/bans?limit=${limit.value}&page=${page.value}&include=${showExpired.value ? 'expired' : ''}`),
  { transform: (response) => ({
    ...response,
    bans: response.bans.map(ban => ({
      ...ban,
      flagList: formatFlags(ban),
    })),
  }) }
)


watch([limit, page], () => refresh())

function formatFlags(ban: ListAPIBan) {
  const output: { symbol: string, text: string }[] = []
  if(ban.flags & APIBanFlags.Suspended) output.push({ symbol: "S", text: "Suspended" })
  if(ban.flags & APIBanFlags.AppealBanned) output.push({ symbol: "A", text: "Has Appeal" })
  if(ban.flags & APIBanFlags.IPBan) output.push({ symbol: "IP", text: "IP Banned" })
  if(ban.notesCount > 0) output.push({ symbol: "N", text: "Has Notes" })
  if(ban.expired) output.push({ symbol: "E", text: "Expired" })
  return output
}
</script>
