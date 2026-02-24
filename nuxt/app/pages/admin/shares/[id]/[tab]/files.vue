<template>
  <UTable :data="addons" :columns="columns" :loading="status === 'pending'" sticky="header" />
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

const columns: TableColumn<AddonInfo>[] = [
  {
    accessorKey: 'filename',
    header: 'Name',
    cell: ({ row }) => h('a', {
      href: `/admin/addons/${row.original.filename}`,
      class: Object.entries(row.original.installInfo).filter(([id,enabled]) => enabled).length > 0 ? "text-blue" : "text-black",
    }, row.original.workshop?.title ?? row.original.filename),
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
    header: 'File Size',
    cell: ({ row }) => formatSize(row.getValue('filesize')),
    meta: {
      class: {
        th: "whitespace-nowrap",
      }
    }
  },
  {
    accessorKey: 'lastModified',
    header: 'Modified At',
    cell: ({ row }) => formatDate(row.getValue('lastModified'), true),
    meta: {
      class: {
        th: "whitespace-nowrap",
      }
    }
  },
  {
    accessorKey: 'downloaded',
    header: 'Downloaded At',
    cell: ({ row }) => formatDate(row.getValue('downloaded'), true),
    meta: {
      class: {
        th: "whitespace-nowrap",
      }
    }
  },
]
</script>
