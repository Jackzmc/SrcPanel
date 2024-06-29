<template>
<div>
  <template v-if="loadState === LoadState.Success">
    <div class="block" v-for="group in groups" :key="group.id">
      <h6 class="title is-4">{{ group.name }}</h6>
      <ServerTable :group="group" @delete="onServerDelete" @update="onServerUpdate" :meta="meta" />
    </div>
  </template>
  <div v-else-if="loadState === LoadState.Loading">
    <div class="block" v-for="i in 3" :key="i">
      <h6 class="title has-skeleton">Group</h6>
      <div class="skeleton-block">
        <span v-for="j in 8" :key="j"> Please wait while we fetch all the server groups. This should take very little time, in fact, it should already be loaded. You shouldn't be able to even read this, unless you are reading the source code.</span>
      </div>
      <br>
    </div>
  </div>
  <div v-else-if="loadState === LoadState.Error">
    <article class="message is-danger">
      <div class="message-body content">
        <Icon icon="fa-exclamation-triangle">Could not fetch groups</Icon>
      </div>
    </article>
  </div>
</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { GroupInfo, ServerGroup, ServerInfo } from '../../../../../../common-types/Server.js';
import { request } from '@/js/util.js';
import ServerTable from '@/components/panel-admin/setup/ServerTable.vue'
import { LoadState } from '@/types/global.js';
import { PanelMetaInfo } from '../../../../../../common-types/Panel';

const props = defineProps<{
  meta: PanelMetaInfo
}>()

let groups = ref<ServerGroup[]>()
let loadState = ref<LoadState>(LoadState.Loading)

async function fetchServers() {
  loadState.value = LoadState.Loading
  const response = await request('/api/panel/servers')
  if(response?.ok) {
    const json = await response.json()
    groups.value = json
    loadState.value = LoadState.Success
  } else {
    loadState.value = LoadState.Error
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
