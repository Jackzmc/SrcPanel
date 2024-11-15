<template>
  <div class="mb-4">
    <CreateServerModal :group="group" :state="createInstanceData.state" :data="createInstanceData.data" v-if="createInstanceData" @close="createInstanceData = null" />
    <h4 class="title is-4">{{ group.name }}</h4>
    <p v-if="group.description" class="subtitle is-6">{{ group.description }}</p>
    <div class="table-container">
      <table :class="['table','is-fullwidth',{'is-bordered': !manage}]">
        <thead>
          <tr>
            <th>Name</th>
            <th :class="manage ? undefined : 'has-text-centered'">Players</th>
            <template v-if="manage">
              <th v-if="group.type === 'source'">Current Map</th>
              <th>Actions</th>
            </template>
            <template v-else>
              <template v-if="group.type === 'source'">
                <th>Current Map</th>
                <th>Direct Connect Command</th>
                <th>Create Lobby Command</th>
              </template>
              <template v-else-if="group.type === 'minecraft'">
                <th>IP</th>
              </template>
            </template>
          </tr>
        </thead>
        <tbody>
          <ServerRow v-for="server in group.servers" :key="server.id" :server="server" :type="group.type" :manage="manage"></ServerRow>
        </tbody>
        <tfoot v-if="manage && group.templateId">
          <tr class="has-background-lighter">
            <td style="vertical-align: middle">Create New Instance</td>
            <td colspan="2"></td>
            <td colspan="2">
              <button type="button" class="button is-info is-small" @click="createInstance">New Instance</button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ServerGroup } from '../../../../common-types/Server';
import ServerRow from '@/components/servers/ServerRow.vue'
import { request } from '@/js/util.js';
import { LoadState } from '@/types/global.js';
import { notify } from '@kyvg/vue3-notification';
import { computed, ref } from 'vue';
import CreateServerModal from './CreateServerModal.vue';

const props = defineProps<{
  group: ServerGroup,
  manage?: boolean
}>()

let createInstanceData = ref<{
  state: LoadState,
  data: unknown
}|null>(null)

async function createInstance() {
  createInstanceData.value = { state: LoadState.Loading, data: null }
  try {
    const response = await fetch(`/api/groups/${props.group.id}/servers?start=1`, {
      method: "POST"
    })
    if(response.ok) {
      const json = await response.json()
      createInstanceData.value.state = LoadState.Success
      createInstanceData.value.data = json
      notify({
        type: "success",
        text: `Started new instance for ${props.group.name}`
      })
    } else {
      const json = await response.json()
      createInstanceData.value.state = LoadState.Error
      createInstanceData.value.data = json
    }
  } catch(err) {
    createInstanceData.value.state = LoadState.Error
    createInstanceData.value.data = (err as any).message
  }
}

</script>

<style scoped>

@media screen and (min-width: 640px) {
  .table-container {
    overflow: inherit !important;
  }
}
</style>
