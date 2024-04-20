<template>
<div>
  <ServerModal v-if="editModalActive" :data="selectedServer" @close="closeModal" @save="onSave" @delete="deleteServer" />
  <ConfirmModal title="Delete Confirmation" v-if="deleteModalActive&&selectedServer" @cancel="deleteModalActive = false" @confirm="deleteServerConfirm">
    <p>Are you sure you want to delete the server:<br><b>{{ selectedServer.name }}</b> <span>({{ selectedServer.id }})</span>?</p>
    <br>
    <p>This will delete all servers that are in that group.</p>
  </ConfirmModal>
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
    <VueDraggableNext :list="Object.values(group.servers)" tag="tbody" handle=".handle" >
      <tr v-for="(server) in group.servers" :key="server.id">
        <td class="valign" style="width:1%"><Icon class="handle" icon="fa-bars"></Icon></td>
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
    </VueDraggableNext>
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
import { VueDraggableNext } from "vue-draggable-next";
import ConfirmModal from '@/components/ConfirmModal.vue';

const emit = defineEmits(['close', 'delete', 'update'])

const props = defineProps<{
  group: ServerGroup
}>()
let selectedServer = ref<ServerInfo|null>(null)
let editModalActive = ref(false)
let deleteModalActive = ref(false)


function editServer(server: ServerInfo | null) {
  selectedServer.value = server
  editModalActive.value = true
}
function onSave(server: ServerInfo) {
  emit('update', props.group, server, selectedServer.value?.id)
  closeModal()
}
function closeModal() {
  selectedServer.value = null
  editModalActive.value = false
}
function deleteServer(server: ServerInfo) {
  selectedServer.value = server
  deleteModalActive.value = true
}
async function deleteServerConfirm() {
  const server = selectedServer.value
  if (!server) return

  const response = await request(`/api/servers/${server.id}`, { method: "DELETE" })
  if(response?.ok) {
    emit("delete", props.group, server.id)
    notify({
      text: `Server ${server.name ?? server.id} deleted`,
      type: "is-success"
    })
  }
  deleteModalActive.value = false
}

</script>

<style scoped>
td.valign {
  vertical-align: middle;
}
</style>
