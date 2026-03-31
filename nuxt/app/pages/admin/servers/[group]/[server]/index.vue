<template>
 <UContainer class="mt-3 bg-neutral-100 p-4 rounded-4xl" style="min-height: 600px">
   <div class="grid grid-cols-3 gap-6">
     <!-- left column -->
     <div class="col-span-2 flex flex-col gap-4">
       <ULink to="/admin/servers" class="text-primary">← back to manage servers list</ULink>
       <ServerBanner v-if="data" :server="data.server" :live-status="live.status" />
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

       <VoiceMembers :server-id="serverId as string" :voice-members="data?.voiceMembers" />
     </div>
   </div>
 </UContainer>
</template>

<script setup lang="ts">
import { type APIListServersV1_Compact, type ServerDetailed } from '@common/Server';
import ServerBanner from '@/components/servers/ServerBanner.vue'
import { useLiveServer } from '~/composables/server/live';
import RecentActivity from '@/components/servers/manage/RecentActivity.vue'
import VoiceMembers from '@/components/servers/manage/VoiceMembers.vue'


const toast = useToast()

const { group: groupId, server: serverId } = useRoute().params;

const { data } = await useFetch<ServerDetailed>(`/api/servers/${serverId}/data`, { key: 'servers.' + serverId });
if (!data) createError({
  statusCode: 404,
  statusMessage: 'Server not found',
})

const { data: servers } = await useFetch(
  `/api/servers/?compact=1`,
  {
    key: 'servers_v1_compact',
    transform: (data: APIListServersV1_Compact[]) => data.map(({ id, name, groupId }) => ({ label: name, value: id, groupId })),
  }
);

const live = reactive(useLiveServer(data.value!))

function onChangeServerSelected(id: string) {
  if(!servers.value) return
  const server = servers.value.find((s) => s.value === id)
  if(!server) return console.warn('missing server entry in servers list', id)
  navigateTo(`/admin/servers/${server.groupId}/${id}`)
}

onMounted(() => {
  live.connect()
})
</script>
