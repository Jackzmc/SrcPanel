<template>
<div>
  <div class="container" v-if="!meta">
    <h1 class="title is-1"><Icon icon="fa-spinner" spin>Setup Loading</Icon></h1>
    <p class="subtitle">
      Please wait, waiting for server information
    </p>
  </div>
  <div class="container" v-if="currentStage == FirstTimeSetupStage.DONE">
    <h1 class="title is-1">Setup Complete</h1>
    <p class="subtitle">
      First time setup has already been completed.
    </p>
    <p><router-link to="/" class="button is-large">Homepage</router-link></p>
  </div>
  <div class="container" style="min-height:400px" v-else>
    <ul class="steps has-content-centered">
      <li v-for="(step, i) in STEPS" :key="i" :class="['steps-segment',{'is-active': i == highestStep }]">
        <router-link :to="{ hash: step.id }" class="has-text-dark">
          <span :class="['steps-marker',{'is-info': i <= highestStep }]">{{ Number(i)+1 }}</span>
          <div class="steps-content">
            <strong>{{ step.label }}</strong>
          </div>
        </router-link>
      </li>
    </ul>
    <br>
    <KeepAlive v-if="currentStepData">
      <component :is="currentStepData.component" :meta="meta" :stage="currentStage" @stage="(s:FirstTimeSetupStage) => currentStage = s" />
    </KeepAlive>
    <div class="block mt-4 mb-6">
      <div class="button is-previous is-medium is-pulled-left" @click="advStep(-1)" v-if="canStepBack"><Icon icon="fa-chevron-left">Previous Step</Icon></div>
      <div class="button is-previous is-info is-medium is-pulled-right" @click="advStep(1)" v-if="canStepNext"><Icon icon="fa-chevron-right" text-left="Next Step"></Icon> </div>
    </div>
    <br>
  </div>
</div>
</template>

<script setup lang="ts">
import { onMounted, ref, Raw, shallowRef, watch, computed } from 'vue';
import { PrivilegedUser } from '@/js/User.js';
import ServersTab from '@/components/panel-admin/setup/tabs/ServersTab.vue'
import ServerGroupsTable from '@/components/panel-admin/setup/tabs/ServerGroupsTable.vue'
import SharesTable from '@/components/panel-admin/setup/tabs/SharesTable.vue'
import PanelSettingsTab from '@/components/panel-admin/setup/tabs/PanelSettingsTab.vue';
import DoneTab from '@/components/panel-admin/setup/tabs/DoneTab.vue';
import IntroTab from '@/components/panel-admin/setup/tabs/IntroTab.vue';
import { useRoute, useRouter } from 'vue-router';
import { FirstTimeSetupStage, PanelMetaInfo } from '../../../../common-types/Panel.js';

const props = defineProps<{
  privUser: PrivilegedUser,
  meta?: PanelMetaInfo
}>()

const route = useRoute()
const router = useRouter()

interface StepData { label: string, id: string, component: Raw<any>  }
enum Step { Intro, ServerGroups, Servers, Shares, Settings, Done }
const STEPS: Record<Step, StepData> = {
  [Step.Intro]: {
    label: "Intro",
    id: "#intro",
    component: IntroTab
  },
  [Step.Settings]: {
    label: "Panel Settings",
    id: "#settings",
    component: PanelSettingsTab
  },
  [Step.ServerGroups]: {
    label: "Server Groups",
    id: "#groups",
    component: ServerGroupsTable
  },
  [Step.Servers]: {
    label: "Servers",
    id: "#servers",
    component: ServersTab
  },
  [Step.Shares]: {
    label: "Shares",
    id: "#shares",
    component:SharesTable
  },

  [Step.Done]: {
    label: "Done",
    id: "#done",
    component: DoneTab
  }
}
let currentStep = ref<Step>(Step.ServerGroups)
let currentStepData = shallowRef<StepData>()
let highestStep = ref<Step>(Step.Intro)

watch(() => route.hash, setStepFromHash)

function setStepFromHash() {
  if(route.hash) {
    for(const [id, step] of Object.entries(STEPS)) {
      if(route.hash === step.id) {
        currentStep.value = Number(id)
        currentStepData.value = step
        if(currentStep.value > highestStep.value) {
          highestStep.value = currentStep.value
        }
        return
      }
    }
  } else {
    router.replace({ hash: STEPS[Step.Intro].id })
  }
}

const canStepBack = computed(() => {
  return currentStep.value > 0
})
const canStepNext = computed(() => {
  return currentStep.value < Step.Done
    && props.privUser // 1st step sets up a user
})

function advStep(offset: number) {
  let nextStep = currentStep.value + offset
  if(nextStep < 0) nextStep = 0
  else if(nextStep > Step.Done) nextStep = Step.Done
  router.replace({ hash: STEPS[nextStep as Step].id })
}

let currentStage = ref<FirstTimeSetupStage>(FirstTimeSetupStage.DONE)

async function getStage() {
  const response = await fetch(`/api/panel/first-time-setup`, { method: "GET"})
  if(response.ok) {
    const json = await response.json()
    currentStage.value = json.stage
  } else {
    alert("Fatal error: Failed to get first time setup data")
  }
}

onMounted(async () => {
  await getStage()
  setStepFromHash()
})
</script>

<style src="node_modules/bulma-o-steps/bulma-steps.min.css" />

<style scoped>
td.valign {
  vertical-align: middle;
}
</style>
