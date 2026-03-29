<template>
 <UContainer class="mt-3">
   <div class="grid grid-cols-3">
     <div class="col-span-2 flex flex-col gap-4">
       <ULink to="/admin/servers" class="text-primary">← back to manage servers list</ULink>
       <ServerBanner v-if="data" :server="data.server" />
     </div>
   </div>
   {{ groupId }}/{{ serverId }}
 </UContainer>
</template>

<script setup lang="ts">
import { type ServerDetailed } from '@common/Server';
import ServerBanner from '@/components/servers/ServerBanner.vue'

const toast = useToast()

const { group: groupId, server: serverId } = useRoute().params;

const { data } = await useFetch<ServerDetailed>(`/api/servers/${serverId}/data`, { key: 'servers.' + serverId });
if (!data) createError({
  statusCode: 404,
  statusMessage: 'Server not found',
})

</script>
