<template>
<div class="container" style="min-height:400px">
  <ul class="steps has-content-centered">
    <li v-for="(step, i) in STEPS" :key="i" :class="['steps-segment',{'is-active': currentStep == i}]">
      <a href="#" class="has-text-dark" @click="setStep(i)">
        <span :class="['steps-marker',{'is-info': i <= highestStep }]">{{ Number(i)+1 }}</span>
        <div class="steps-content">
          <strong>{{ step.label }}</strong>
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
  <template v-else-if="currentStep === Step.Shares">
    <SharesTable />
  </template>
  <div class="block mt-4 mb-6">
    <div class="button is-previous is-medium is-pulled-left" @click="advStep(-1)" v-if="currentStep > 0"><Icon icon="fa-chevron-left">Previous Step</Icon></div>
    <div class="button is-previous is-info is-medium is-pulled-right" @click="advStep(1)" v-if="currentStep < Step.Done"><Icon icon="fa-chevron-right" text-left="Next Step"></Icon> </div>
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
import SharesTable from '@/components/panel-admin/setup/SharesTable.vue'

const props = defineProps<{
  privUser: PrivilegedUser
}>()

enum Step { ServerGroups, Servers, Shares, Settings, Done }
const STEPS: Record<Step, { label: string, id: string }> = {
  [Step.ServerGroups]: {
    label: "Server Groups",
    id: "groups"
  },
  [Step.Servers]: {
    label: "Servers",
    id: "servers"
  },
  [Step.Shares]: {
    label: "Shares",
    id: "shares"
  },
  [Step.Settings]: {
    label: "Panel Settings",
    id: "settings"
  },
  [Step.Done]: {
    label: "Done",
    id: "done"
  }
}
let currentStep = ref<Step>(Step.ServerGroups)
let highestStep = ref<Step>(Step.ServerGroups)

function setStep(index: number) {
  currentStep.value = index
  if(index > highestStep.value) {
    highestStep.value = index
  }
  window.location.hash = STEPS[currentStep.value].id
}
function advStep(offset: number) {
  let nextStep = currentStep.value + offset
  if(nextStep < 0) nextStep = 0
  else if(nextStep > Step.Done) nextStep = Step.Done
  setStep(nextStep)
}

onMounted(() => {
  if(window.location.hash) {
    const hash = window.location.hash.slice(1)
    for(const [id, step] of Object.entries(STEPS)) {
      if(hash === id) {
        currentStep.value = Number(id)
        return
      }
    }
  }
  setStep(Step.ServerGroups)
})
</script>

<style src="node_modules/bulma-o-steps/bulma-steps.min.css" />

<style scoped>
td.valign {
  vertical-align: middle;
}
</style>
