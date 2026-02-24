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
      <div v-else-if="addons&&share" class="grid grid-cols-4 gap-4">
        <div class="col-span-3">
           <NuxtPage :addons="addons" />
        </div>
        <div class="space-y">
          <div class="space-y-2">
            <UCard>
              <h4 class="font-semibold font-2xl">{{ addons.length }} files</h4>
              <UFormField label="Selected Share" v-if="shares">
                <USelect v-model="selectedShare" :items="shares.map((share) => share.id)" @change="onChangeShare" />
              </UFormField>
              <UTabs class="mt-4"
                :items="tabs"
                v-model="route.params.tab as string"
                @update:v-model="val => navigateTo(`/admin/shares/${route.params.id}/${val}`)"
              />
            </UCard>
            <div class="flex flex-col gap-2">
              <UButton color="primary" size="lg">
                <UIcon name="i-lucide-plus" />
                Workshop Addon
              </UButton>
              <UButton color="primary" size="lg">
                <UIcon name="i-lucide-upload" />
                Upload
              </UButton>
            </div>
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

const tabs = [
  {
    label: 'Files',
    icon: 'i-lucide-file',
    slot: 'files'
  },
  {
    label: 'Maps',
    icon: 'i-lucide-map',
    slot: 'maps'
  }
]

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


async function onChangeShare() {
  await navigateTo(`/admin/shares/${selectedShare.value}`)
}
</script>
