<template>
<div>
  <ServerGroupModal v-if="modalActive" :data="selectedGroup" @close="closeModal" @save="onSave" />
  <table class="table is-fullwidth is-bordered" v-if="loadState == LoadState.Success">
    <thead>
      <tr>
        <th style="width:0%"></th>
        <th>Id</th>
        <th>Name</th>
        <th>Type</th>
        <th># of Actions</th>
        <th style="width:0%"></th>
      </tr>
    </thead>
    <VueDraggableNext v-model="groups" tag="tbody" handle=".handle">
      <tr v-for="(group) in groups" :key="group.id">
        <td class="valign" style="width:1%"><Icon class="handle" icon="fa-bars"></Icon></td>
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
    </VueDraggableNext>
    <tfoot>
      <tr>
        <td colspan="6"><button class="is-info is-outlined button" @click="editGroup(null)"><Icon icon="fa-plus">New Group</Icon></button></td>
      </tr>
    </tfoot>
  </table>
  <div v-else-if="loadState === LoadState.Loading">
    <p class="has-text-centered is-size-3"><Icon icon="fa-spinner" spin icon-class="mr-4">Loading</Icon></p>
    <div class="skeleton-block" v-for="i in 6" :key="i"></div>
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
import { GroupInfo, ServerGroup } from '../../../../../common-types/Server.js';
import { request } from '@/js/util.js';
import { notify } from '@kyvg/vue3-notification';
import ServerGroupModal from './ServerGroupModal.vue';
import { LoadState } from '@/types/global.js';
import { VueDraggableNext } from "vue-draggable-next";

type Group = GroupInfo
// TODO: different type. Just the group, no servers? might be nice to have server count
let groups = ref<Group[]>()
let loadState = ref<LoadState>(LoadState.Loading)
async function fetchGroups() {
  loadState.value = LoadState.Loading
  const response = await request('/api/panel/groups')
  if(response?.ok) {
    const json = await response.json()
    groups.value = json
    loadState.value = LoadState.Success
  } else {
    loadState.value = LoadState.Error
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
  fetchGroups()
})
</script>

<style scoped>
td.valign {
  vertical-align: middle;
}
</style>
