<template>
  <div v-if="share">
    <Hero :title="`Shares / ${ route.params.id }`" />
    <UContainer class="fluid">
      <div v-if="status === 'pending'" class="flex justify-center py-12">
        <div class="flex flex-col items-center">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 my-4" />
          <h2 class="text-2xl">Loading files for share <span class="font-semibold">{{ route.params.id }}</span></h2>
          <p class="text-lg">This may take some time, please wait...</p>
        </div>
      </div>
      <div v-else-if="addons&&share" class="grid grid-cols-3 gap-4">
        <div class="col-span-2">
          <UTable :data="addons" :columns="columns" :loading="status === 'pending'" sticky="header" />
        </div>
        <div class="space-y">
          <div class="space-y-2">
            <UCard>
              <h4 class="font-semibold">{{ addons.length }} files</h4>
              <UFormField label="Selected Share" v-if="shares">
                <USelect v-model="selectedShare" :items="shares.map((share) => share.id)" @change="onChangeShare" />
              </UFormField>
            </UCard>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { type AddonInfo, type APIShareAddons, type ShareData } from '@common/Share.js'
import { formatDate, formatSize } from '@common/methods/format'
import type { TableColumn } from '@nuxt/ui'

const { data: shares } = await useFetch<ShareData[]>(`/api/shares`, { key: `shares` })

const route = useRoute()

const selectedShare = ref<string>(route.params.id as string)

const { data, status } = await useLazyFetch<APIShareAddons>(`/api/shares/${route.params.id}/addons`, { key: `shares.${route.params.id}` })
// if(!data.value?.shareInfo) {
//   throw createError({ statusCode: 404, statusMessage: 'Share not found' })
// }
watch(data, (val) => {
  if (val && !val.shareInfo) {
    throw createError({ statusCode: 404, statusMessage: 'Share not found' })
  }
})
const share = computed(() => data.value?.shareInfo)
const addons = computed(() => data.value?.addons)
// const { shareInfo: share, addons } = data.value

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

async function onChangeShare() {
  await navigateTo(`/admin/shares/${selectedShare.value}`)
}
</script>
