<template>
<div>
  <ServerGroupModal v-if="modalActive" :data="selectedGroup" @close="closeModal" @save="onSave" />
  <table class="table is-fullwidth is-bordered">
    <thead>
      <tr>
        <th>Id</th>
        <th>Name</th>
        <th>Type</th>
        <th># Actions</th>
        <th></th>
      </tr>
    </thead>
    <tbody class="tdf">
      <tr v-for="(group) in groups" :key="group.id">
        <td class="valign">{{ group.id }}</td>
        <td class="valign">{{ group.name }}</td>
        <td class="valign">{{ group.type }}</td>
        <td class="valign">{{ group.actions?.length ?? 0 }}</td>
        <td>
          <div class="buttons">
            <a class="button is-outlined is-info" @click="editGroup(group)"><Icon icon="fa-edit">Edit</Icon></a>
            <a class="button is-outlined is-danger" @click="deleteGroup(group)"><Icon icon="fa-trash">Delete</Icon></a>
          </div>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="has-background">
        <td colspan="6"><button class="is-info is-outlined button" @click="editGroup(null)"><Icon icon="fa-plus">New Group</Icon></button></td>
      </tr>
    </tfoot>
  </table>
</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { GroupInfo, ServerGroup } from '../../../../../common-types/Server.js';
import { request } from '@/js/util.js';
import { notify } from '@kyvg/vue3-notification';
import ServerGroupModal from './ServerGroupModal.vue';

const props = defineProps<{

}>()
type Group = GroupInfo
// TODO: different type. Just the group, no servers? might be nice to have server count
let groups = ref<Group[]>()
  async function fetchServers() {
  const response = await request('/api/servers')
  if(response?.ok) {
    const json = await response.json()
    groups.value = json
  }
}
let selectedGroup = ref<Group|null>(null)
let modalActive = ref(false)

function editGroup(group: Group | null) {
  selectedGroup.value = group
  modalActive.value = true
}
function onSave(group: Group, oldId?: string) {
  if(!groups.value) return
  if(oldId) {
    // Delete old id incase the id changed
    const oldIndex = groups.value.findIndex(g => g.id === oldId)
    if(oldIndex != -1) groups.value.splice(oldIndex, 1)
  }

  for(let i = 0; i < groups.value.length; i++) {
    if(groups.value[i].id === group.id) {
      // Update existing
      groups.value[i] = group
      closeModal()
      return
    }
  }
  // Add new:
  groups.value.push(group)
  closeModal()
}
function closeModal() {
  selectedGroup.value = null
  modalActive.value = false
}
async function deleteGroup(group: Group) {
  const response = await request(`/api/panel/groups/${group.id}`, { method: "DELETE" })
  if(response?.ok) {
    groups.value = groups.value?.filter(g => g.id != group.id)
    notify({
      text: `Group ${group.name ?? group.id} deleted`,
      type: "is-success"
    })
  }
}

onMounted(() => {
  fetchServers()
})
</script>

<style scoped>
td.valign {
  vertical-align: middle;
}
</style>
