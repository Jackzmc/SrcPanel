<template>
<div class="container" style="min-height:400px">
  <ul class="steps has-content-centered">
    <li v-for="(step, i) in STEPS" :key="i" :class="['steps-segment',{'is-active': currentStep == i}]">
      <a href="#" class="has-text-dark" @click="setStep(i)">
        <span :class="['steps-marker',{'is-info': i <= highestStep }]">{{ i+1 }}</span>
        <div class="steps-content">
          <strong>{{ step }}</strong>
        </div>
      </a>
    </li>
  </ul>
  <br>
  <template v-if="currentStep === Step.ServerGroups">
    <ServerGroupsTable />
  </template>
  <template v-else-if="currentStep === Step.Servers">
    <ServersTab />
  </template>
  <a class="button is-success is-inverted is-large" @click="editShare(null)">Add Share</a>
    <a class="button is-success is-inverted is-large" @click="editServer(null)">Add Server</a>
    <component v-if="modal" @close="stopEditing" :is="modal.component" :data="modal.data"></component>

  <br>
  <div class="block mt-4 mb-6">
    <div class="button is-previous is-medium is-pulled-left" @click="advStep(-1)" v-if="currentStep > 0"><Icon icon="fa-chevron-left">Previous Step</Icon></div>
    <div class="button is-previous is-info is-medium is-pulled-right" @click="advStep(1)" v-if="currentStep < STEPS.length - 1"><Icon icon="fa-chevron-right" text-left="Next Step"></Icon> </div>
  </div>
  <br>
</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ShareModal from '@/components/panel-admin/setup/ShareModal.vue';
import ServerModal from '@/components/panel-admin/setup/ServerModal.vue';
import { ExportGroupInfo, ServerGroup, ServerInfo } from '../../../../common-types/Server.js';
import { request } from '@/js/util.js';
import { PrivilegedUser } from '@/js/User.js';
import { ShareInfo } from '../../../../common-types/Share.js';
import ServersTab from '@/components/panel-admin/setup/ServersTab.vue'
import ServerGroupsTable from '@/components/panel-admin/setup/ServerGroupsTable.vue'

const props = defineProps<{
  privUser: PrivilegedUser
}>()

const STEPS = ["Server Groups", "Servers", "Shares", "Panel Settings", "Done"]
enum Step { ServerGroups, Servers, Shares, Settings, Done }
let currentStep = ref<Step>(Step.ServerGroups)
let highestStep = ref<Step>(Step.ServerGroups)
let modal = ref<{
  component: any,
  data: any
}>()

function setStep(index: number) {
  currentStep.value = index
  if(index > highestStep.value) {
    highestStep.value = index
  }
}
function advStep(offset: number) {
  let nextStep = currentStep.value + offset
  if(nextStep < 0) nextStep = 0
  else if(nextStep >= STEPS.length) nextStep = STEPS.length - 1
  currentStep.value = nextStep
}
function editServer(server: ServerInfo | null) {
  modal.value = {
    component: ServerModal,
    data: server
  }
}
function editShare(share: ShareInfo | null) {
  modal.value = {
    component: ShareModal,
    data: share
  }
}
function stopEditing() {
  modal.value = undefined
}
function deleteServer(server: ServerInfo, i: number) {
  if(confirm(`Are you sure you want to delete ${server.name} (${server.id})?`)) {
    // gro.value?.splice(i, 1)
  }
}


onMounted(() => {
})
</script>

<style src="node_modules/bulma-o-steps/bulma-steps.min.css" />

<style scoped>
td.valign {
  vertical-align: middle;
}
</style>
