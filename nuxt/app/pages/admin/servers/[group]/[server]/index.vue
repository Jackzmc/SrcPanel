<template>
 <UContainer class="mt-3">
   <div class="grid grid-cols-3">
     <div class="col-span-2">
       <ULink to="/admin/servers" class="text-primary">← back to manage servers list</ULink>
       <div v-if="data" class="bg-light-blue p-4 rounded-2xl">
         <div class="flex justify-between">
           <!-- Left side -->
           <div class="flex flex-col">
              <!-- Title/desc -->
              <div class="flex flex-col">
                <h2 class="text-2xl font-bold">{{ data.server?.name }}</h2>
                <p class="text-gray-600">
                  {{ data.server?.ip }}:{{ data.server?.port }}
                  <UTooltip text="Click to copy IP">
                    <UIcon class="cursor-pointer" name="lucide-copy" @click="copyIp" />
                  </UTooltip>
                </p>
              </div>

              <!-- Tags -->
              <div class="flex gap-1 mt-4">
                <UBadge v-for="tag in data.server.tags" :key="tag" color="neutral">{{ tag }}</UBadge>
              </div>
            </div>
            <!-- Right side -->
            <div class="flex flex-col justify-between items-end">
              <!-- Upper status badges -->
              <div class="flex gap-1">
                <UBadge
                  :leading-icon="data.server.online ? 'lucide:circle' : 'lucide:square'"
                  :color="data.server.online ? 'success' : 'error'"
                >{{ data.server.online ? 'Online' : 'Offline' }}</UBadge>
                <UBadge color="primary" leading-icon="lucide:circle-check">Live</UBadge>
                <UTooltip text="Server Id"><UBadge variant="outline" color="neutral">{{ data.server.id }}</UBadge></UTooltip>
              </div>
              <!-- Actions -->
              <div>Buttons</div>
            </div>
         </div>
       </div>
     </div>
   </div>
   {{ groupId }}/{{ serverId }}
 </UContainer>
</template>

<script setup lang="ts">
import { type ServerData, type ServerDetailed } from '@common/Server';

const toast = useToast()

const { group: groupId, server: serverId } = useRoute().params;

const { data } = await useFetch<ServerDetailed>(`/api/servers/${serverId}/data`, { key: 'servers.' + serverId });
if (!data) createError({
  statusCode: 404,
  statusMessage: 'Server not found',
})

async function copyIp() {
  if(!data.value) return;
  await navigator.clipboard.writeText(`${data.value.server.ip}:${data.value.server.port}`);
  toast.add({
    color: 'info',
    description: 'Server IP copied to clipboard',
    icon: 'lucide:copy',
    duration: 2000
  })
}
</script>
