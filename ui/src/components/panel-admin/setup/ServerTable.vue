<template>
<div>
  <ServerModal v-if="modalActive" :data="selectedServer" @close="closeModal" @save="onSave" />
  <table class="table is-fullwidth is-bordered">
    <thead>
      <tr>
        <th></th>
        <th>Id</th>
        <th>Name</th>
        <th>Type</th>
        <th>IP</th>
        <th>Port</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody class="tdf">
      <tr v-for="(server) in group.servers" :key="server.id">
        <td></td>
        <td class="valign">{{ server.id }}</td>
        <td class="valign">{{ server.name }}</td>
        <td class="valign">Left 4 Dead 2</td>
        <td class="valign">127.0.0.1</td>
        <td class="valign">27015</td>
        <td>
          <div class="buttons">
            <a class="button is-outlined is-info" @click="editServer(server)"><Icon icon="fa-edit">Edit</Icon></a>
            <a class="button is-outlined is-danger" @click="deleteServer(server)"><Icon icon="fa-trash">Delete</Icon></a>
          </div>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="has-background">
        <td></td>
        <td colspan="6"><button class="is-info is-outlined button" @click="editServer(null)"><Icon icon="fa-plus">New Server</Icon></button></td>
      </tr>
    </tfoot>
  </table>
</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { GroupInfo, ServerGroup, ServerInfo } from '../../../../../common-types/Server.js';
import { request } from '@/js/util.js';
import { notify } from '@kyvg/vue3-notification';
import ServerModal from './ServerModal.vue'

const emit = defineEmits(['close', 'delete', 'update'])

const props = defineProps<{
  group: ServerGroup
}>()
let selectedServer = ref<ServerInfo|null>(null)
let modalActive = ref(false)

function editServer(server: ServerInfo | null) {
  selectedServer.value = server
  modalActive.value = true
}
function onSave(server: ServerInfo) {
  emit('update', props.group, server, selectedServer.value?.id)
  closeModal()
}
function closeModal() {
  selectedServer.value = null
  modalActive.value = false
}
async function deleteServer(server: ServerInfo) {
  const response = await request(`/api/servers/${server.id}`, { method: "DELETE" })
  if(response?.ok) {
    emit("delete", props.group, server.id)
    notify({
      text: `Server ${server.name ?? server.id} deleted`,
      type: "is-success"
    })
  }
}


</script>
