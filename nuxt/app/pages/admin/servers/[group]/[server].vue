<template>
 <UContainer class="mt-3 bg-neutral-100 dark:bg-neutral-950 p-4 rounded-4xl" style="min-height: 600px">
   <div class="grid grid-cols-3 gap-6">
     <!-- left column -->
     <div class="col-span-2 flex flex-col gap-4">
      <div>
        <ULink to="/admin/servers" class="text-primary">← back to manage servers list</ULink>
      </div>
      <ServerBanner v-if="data" :data="data" :ws="ws" />
      <GameOverview v-if="data" :data="data" />

      <UTabs :default-value="activeTab" :items="tabs" :content="false" variant="pill"
        @update:model-value="tab => navigateTo(`/admin/servers/${groupId}/${serverId}/${tab}`)"
        :ui="{
          list: 'bg-white dark:bg-black rounded-xl',
          label: 'data-[state=inactive]:text-black cursor-pointer',
          trigger: 'data-[state=active]:hover:bg-primary-400'
        }"
      />

      <NuxtPage v-if="data" :data="data" :ws="ws" :ws-status="ws.wsStatus" :logs="ws.logs" />
     </div>
     <!-- right column -->
     <div class="col-span-1 flex flex-col gap-4 mt-10">
       <UFormField label="Select another server">
         <USelect :items="servers" :default-value="serverId as string"
            class="w-full"
            @update:modelValue="onChangeServerSelected"
          />
       </UFormField>

       <RecentActivity :server-id="serverId as string" />

       <div id="sidebar" />
     </div>
   </div>
 </UContainer>
</template>

<script setup lang="ts">
import { type APIListServersV1_Compact, type ServerDetailed } from '@common/Server';
import ServerBanner from '@/components/servers/ServerBanner.vue'
import { useServerWebsocket, type WebsocketExportProp } from '~/composables/server/live';
import RecentActivity from '@/components/servers/manage/RecentActivity.vue'
import type { TabsItem } from '@nuxt/ui';
import GameOverview from '@/components/servers/manage/GameOverview.vue'

const { group: groupId, server: serverId } = useRoute().params;

const { data } = await useFetch<ServerDetailed>(`/api/servers/${serverId}/data`, { key: 'servers.' + serverId });
if (!data) createError({
  statusCode: 404,
  statusMessage: 'Server not found',
})

import live2 from '@/assets/test_data/live/live2.json'

data.value!.live = live2 as any
useHead({
  title: `${data.value?.server.name} - Server Info`
})

const { data: servers } = await useFetch(
  `/api/servers/?compact=1`,
  {
    key: 'servers_v1_compact',
    transform: (data: APIListServersV1_Compact[]) => data.map(({ id, name, groupId }) => ({ label: name, value: id, groupId })),
  }
);

const tabs: TabsItem[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'Manage', value: 'manage' },
  { label: 'Metrics',   value: 'metrics' },
]

const route = useRoute()
const router = useRouter()

const activeTab = computed({
  get() {
    return route.path.split('/').at(-1) ?? 'overview'
  },
  set(tab) {
    router.push(`/admin/servers/${groupId}/${serverId}/${tab}`)
  }
})

const ws = useServerWebsocket(data.value!)

function onChangeServerSelected(id: string) {
  if(!servers.value) return
  const server = servers.value.find((s) => s.value === id)
  if(!server) return console.warn('missing server entry in servers list', id)
  navigateTo(`/admin/servers/${server.groupId}/${id}`)
}

onMounted(() => {
  ws.connect()
})
</script>
