<template>
<div>
  <div class="block" v-for="group in groups" :key="group.id">
    <h6 class="title is-4">{{ group.name }}</h6>
    <ServerTable :group="group" @delete="onServerDelete" @update="onServerUpdate" />
  </div>
</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { GroupInfo, ServerGroup, ServerInfo } from '../../../../../common-types/Server.js';
import { request } from '@/js/util.js';
import ServerTable from '@/components/panel-admin/setup/ServerTable.vue'


let groups = ref<ServerGroup[]>()
  async function fetchServers() {
  const response = await request('/api/servers')
  if(response?.ok) {
    const json = await response.json()
    groups.value = json
  }
}

function onServerUpdate(group: ServerGroup, server: ServerInfo, oldId?: string) {
  if(!groups.value) return
  const g = groups.value.find(g => g.id === group.id)
  if(!g) return

  if(oldId) {
    // In case the id changed, we need to remove the old entry:
    delete g.servers[oldId]
  }
  g.servers[server.id] = server
}
function onServerDelete(group: ServerGroup, server: ServerInfo) {
  if(!groups.value) return
  const g = groups.value.find(g => g.id === group.id)
  if(!g) return

  delete g.servers[server.id]
}

onMounted(() => {
  fetchServers()
})
</script>
