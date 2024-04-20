<template>
  <div>
    <ShareModal v-if="modalActive" :data="selectedShare" @close="closeModal" @save="onSave" />
    <table class="table is-fullwidth is-bordered" v-if="loadState == LoadState.Success">
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
      <VueDraggableNext :list="shares" tag="tbody" handle=".handle" >
        <tr v-for="(share) in shares" :key="share.id">
          <td class="valign" style="width:1%"><Icon class="handle" icon="fa-bars"></Icon></td>
          <td class="valign">{{ share.id }}</td>
          <td class="valign">{{ share.name }}</td>
          <td class="valign">Left 4 Dead 2</td>
          <td class="valign">127.0.0.1</td>
          <td class="valign">27015</td>
          <td>
            <div class="buttons">
              <a class="button is-outlined is-info" @click="editShare(share)"><Icon icon="fa-edit">Edit</Icon></a>
              <a class="button is-outlined is-danger" @click="deleteShare(share)"><Icon icon="fa-trash">Delete</Icon></a>
            </div>
          </td>
        </tr>
      </VueDraggableNext>
      <tfoot>
        <tr class="has-background">
          <td></td>
          <td colspan="6"><button class="is-info is-outlined button" @click="editShare(null)"><Icon icon="fa-plus">New Share</Icon></button></td>
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
import { request } from '@/js/util.js';
import { notify } from '@kyvg/vue3-notification';
import { VueDraggableNext } from "vue-draggable-next";
import { LoadState } from '@/types/global.js';
import { ShareInfo } from '../../../../../../common-types/Share.js';
import ShareModal from '../ShareModal.vue'

const emit = defineEmits(['close', 'delete', 'update'])
type Share = ShareInfo
// TODO: different type. Just the group, no servers? might be nice to have server count
let shares = ref<Share[]>()
let loadState = ref<LoadState>(LoadState.Loading)
async function fetchShares() {
  loadState.value = LoadState.Loading
  const response = await request('/api/shares')
  if(response?.ok) {
    const json = await response.json()
    shares.value = json
    loadState.value = LoadState.Success
  } else {
    loadState.value = LoadState.Error
  }
}
let selectedShare = ref<Share|null>(null)
let modalActive = ref(false)

function editShare(share: Share | null) {
  selectedShare.value = share
  modalActive.value = true
}
function onSave(share: Share, oldId?: string) {
  if(!shares.value) return
  if(oldId) {
    // Delete old id incase the id changed
    const oldIndex = shares.value.findIndex(g => g.id === oldId)
    if(oldIndex != -1) shares.value.splice(oldIndex, 1)
  }

  for(let i = 0; i < shares.value.length; i++) {
    if(shares.value[i].id === share.id) {
      // Update existing
      shares.value[i] = share
      closeModal()
      return
    }
  }
  // Add new:
  shares.value.push(share)
  closeModal()
}
function closeModal() {
  selectedShare.value = null
  modalActive.value = false
}
async function deleteShare(share: Share) {
  const response = await request(`/api/shares/${share.id}`, { method: "DELETE" })
  if(response?.ok) {
    shares.value = shares.value?.filter(g => g.id != share.id)
    notify({
      text: `Share ${share.name ?? share.id} deleted`,
      type: "is-success"
    })
  }
}
onMounted( () => {
  fetchShares()
})
</script>

<style scoped>
td.valign {
  vertical-align: middle;
}
  </style>
