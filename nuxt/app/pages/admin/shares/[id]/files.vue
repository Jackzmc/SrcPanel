<template>
  <div>
    <div class="flex flex-col gap-4 mb-6">
      <UInput v-model="searchQuery" placeholder="Search files..." icon="i-lucide-search" class="flex-1 w-lg" />
    </div>

    <UTable :data="addons" :columns="columns"
      :loading="status === 'pending'"
      sticky="header"
      v-model:global-filter="searchQuery"
    />
  </div>
</template>

<script setup lang="ts">
import { formatDate, formatSize } from '@common/methods/format'
import type { TableColumn } from '@nuxt/ui'
import type { AddonInfo, ShareInfo } from '@common/Share';
import type { AsyncDataRequestStatus } from '#app';

const props = defineProps<{
  share: ShareInfo,
  addons: AddonInfo[],
  status: AsyncDataRequestStatus
}>()

useHead({
  title: `Maps - ${props.share.name} - Shares`
})
const sortHeader = (label: string) => (({ column }: { column: any } ) => {
  const isSorted = column.getIsSorted()

  /** @ts-expect-error is defined */
  return h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    label: 'Name',
    icon: isSorted
      ? isSorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : 'i-lucide-arrow-down-wide-narrow'
      : 'i-lucide-arrow-up-down',
    class: '-mx-2.5',
    onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
  })
})

// This is to stop TS from complaining about use in h()
import ULink from '@nuxt/ui/components/Link.vue'

const columns: TableColumn<AddonInfo>[] = [
  {
    accessorKey: 'filename',
    // header: 'Name',
    cell: ({ row }) => h(ULink, {
      to: { name: 'admin-shares-id-files', params: { id: props.share.id }, query: { file: row.original.filename } },
      class: Object.entries(row.original.installInfo).filter(([id,enabled]) => enabled).length > 0 ? "text-blue" : "text-black",
    }, () => row.original.workshop?.title ?? row.original.filename),
    header: sortHeader("Name"),
    meta: {
      class: {
        th: "whitespace-normal w-1/3",
        td: "whitespace-normal break-words"
      }
    }
  },
  {
    accessorKey: 'installInfo',
    header: 'Enabled On',
    cell: ({ row }) => {
      const list = Object.entries(row.original.installInfo)
        .filter(([destId,enabled]) => enabled)
        .map(([destId,enabled]) => destId)
      return list.join(', ')
    },
    meta: {
      class: {
        th: "whitespace-nowrap",
      }
    }
  },
  {
    accessorKey: 'filesize',
    header: sortHeader("File Size"),
    cell: ({ row }) => formatSize(row.getValue('filesize')),
    meta: {
      class: {
        th: "whitespace-nowrap",
      }
    }
  },
  {
    accessorKey: 'lastModified',
    header: sortHeader("Modified At"),
    cell: ({ row }) => formatDate(row.getValue('lastModified'), true),
    meta: {
      class: {
        th: "whitespace-nowrap",
      }
    }
  },
  {
    accessorKey: 'downloaded',
    header: sortHeader("Downloaded At"),
    cell: ({ row }) => formatDate(row.getValue('downloaded'), true),
    meta: {
      class: {
        th: "whitespace-nowrap",
      }
    }
  },
]

const searchQuery = ref<string|undefined>()
</script>
