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
  <KeepAlive v-if="currentStepData">
    <component :is="currentStepData.component" />
  </KeepAlive>
  <div class="block mt-4 mb-6">
    <div class="button is-previous is-medium is-pulled-left" @click="advStep(-1)" v-if="currentStep > 0"><Icon icon="fa-chevron-left">Previous Step</Icon></div>
    <div class="button is-previous is-info is-medium is-pulled-right" @click="advStep(1)" v-if="currentStep < Step.Done"><Icon icon="fa-chevron-right" text-left="Next Step"></Icon> </div>
  </div>
  <br>
</div>
</template>

<script setup lang="ts">
import { onMounted, ref, markRaw, Raw, shallowRef, watch } from 'vue';
import ShareModal from '@/components/panel-admin/setup/ShareModal.vue';
import ServerModal from '@/components/panel-admin/setup/ServerModal.vue';
import { ExportGroupInfo, ServerGroup, ServerInfo } from '../../../../common-types/Server.js';
import { request } from '@/js/util.js';
import { PrivilegedUser } from '@/js/User.js';
import { ShareInfo } from '../../../../common-types/Share.js';
import ServersTab from '@/components/panel-admin/setup/tabs/ServersTab.vue'
import ServerGroupsTable from '@/components/panel-admin/setup/tabs/ServerGroupsTable.vue'
import SharesTable from '@/components/panel-admin/setup/tabs/SharesTable.vue'
import PanelSettingsTab from '@/components/panel-admin/setup/tabs/PanelSettingsTab.vue';
import DoneTab from '@/components/panel-admin/setup/tabs/DoneTab.vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps<{
  privUser: PrivilegedUser
}>()

const route = useRoute()
const router = useRouter()

enum Step { ServerGroups, Servers, Shares, Settings, Done }
interface StepData { label: string, id: string, component: Raw<any>  }
const STEPS: Record<Step, StepData> = {
  [Step.ServerGroups]: {
    label: "Server Groups",
    id: "groups",
    component: ServerGroupsTable
  },
  [Step.Servers]: {
    label: "Servers",
    id: "servers",
    component: ServersTab
  },
  [Step.Shares]: {
    label: "Shares",
    id: "shares",
    component:SharesTable
  },
  [Step.Settings]: {
    label: "Panel Settings",
    id: "settings",
    component: PanelSettingsTab
  },
  [Step.Done]: {
    label: "Done",
    id: "done",
    component: DoneTab
  }
}
let currentStep = ref<Step>(Step.ServerGroups)
let currentStepData = shallowRef<StepData>()
let highestStep = ref<Step>(Step.ServerGroups)

watch(() => route.hash, setStepFromHash)

function setStepFromHash() {
  if(!route.hash) return
  const hash = route.hash.slice(1)
  for(const [id, step] of Object.entries(STEPS)) {
    if(hash === step.id) {
      currentStep.value = Number(id)
      currentStepData.value = step
      return
    }
  }
}

function setStep(step: Step) {
  currentStep.value = step
  if(step > highestStep.value) {
    highestStep.value = step
  }
  router.replace({ hash: "#" + STEPS[currentStep.value].id })
}
function advStep(offset: number) {
  let nextStep = currentStep.value + offset
  if(nextStep < 0) nextStep = 0
  else if(nextStep > Step.Done) nextStep = Step.Done
  setStep(nextStep)
}

onMounted(() => {
  setStepFromHash()
  setStep(Step.ServerGroups)
})
</script>

<style src="node_modules/bulma-o-steps/bulma-steps.min.css" />

<style scoped>
td.valign {
  vertical-align: middle;
}
</style>
