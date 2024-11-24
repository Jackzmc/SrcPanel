<template>
<div class="container is-fluid mx-4">
  <div class="block">
    <div class="columns">
      <div class="column is-8" >
          <DoneModal v-if="serverInfo" :server="serverInfo" />
          <div class="tabs is-toggle is-fullwidth is-large">
          <ul>
            <li v-for="(step, i) in STEPS" :key="i" :class="{'is-active': currentStep >= i }" >
              <a @click="setStep(i)" :style="{'opacity': (i > highestStep) ? 0.5: undefined, cursor: i > highestStep ? 'not-allowed' : undefined }" :disabled="!meta">
                <Icon :icon="step.icon"></Icon>
                <span>{{ step.title }}</span>
              </a>
            </li>
          </ul>
        </div>
        <SettingsPage v-if="currentStep === 0 && meta" :priv-user="privUser" :meta="meta" v-model="formData" />
        <ManagePlugins v-else-if="currentStep === 1 && meta" :priv-user="privUser" :meta="meta" :form-data="formData" v-model="enabledPlugins" />
        <ManageAddons v-else-if="currentStep === 2" @add-item="onAddonChange" @del-item="onAddonChange" />
        <ConfirmPage v-else-if="currentStep === 3 || currentStep === 4" :form="form" @server="(s: CustomServerInfo) => serverInfo = s"/>
        <div class="box has-background-info-light" v-else>
          <h4 class="title is-3"><Icon icon="fa-spinner" icon-class="mr-2" spin >Loading</Icon></h4>
          <p class="subtitle is-5">Please wait, fetching information...</p>
        </div>
        <br>
        <button class="button" @click="setStep(currentStep - 1)" v-if="meta && currentStep > 0">
          <Icon icon="fa-chevron-left">Back</Icon>
        </button>
        <button :class="['button','is-pulled-right',{'is-info': canAdvance}]" @click="setStep(currentStep + 1)" v-if="meta && currentStep < STEPS.length - 1" :disabled="!canAdvance">
          <Icon icon="fa-chevron-right"  text-left="Next"></Icon>
        </button>
      </div>
      <div class="column is-3">
        <div class="box has-background-lighter" style="border-radius: 1px">
          <h4 class="title is-4 has-text-centered">Overview</h4>
          <ul>
            <li><b>Name: </b>{{ form.name }}</li>
            <li><b>Game: </b><span v-if="formData.game">{{ formData.game.title }} ({{ formData.game.appid }})</span></li>
            <li><b>5+ Support: </b>{{ form.extraPlayers ? 'Yes' : 'None' }}</li>
            <li><b>Memory: </b> 500 MB</li>
            <li><b>Plugins: </b> {{ form.enabledPlugins.length }} enabled</li>
            <li><b>Addons: </b> {{ form.enabledAddons.length }} enabled</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue';
import { PrivilegedUser } from '@/js/User.js';
import { computed, onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// TODO: pull from server instead
import ManageAddons from '@/components/servers/custom-server/ManageAddons.vue';
import { WorkshopItem } from '../../../../common-types/Share.js';
import PluginFeature from '../../../../server/src/modules/servers/features/Plugin';
import { SMPluginMeta, SMPluginFlag, CustomServerMetaInfo, CustomServerInfo } from '../../../../common-types/CustomServer.js'
import { CustomServerForm } from '../../../../common-types/CustomServer';
import ConfirmPage from '@/components/servers/custom-server/ConfirmPage.vue';
import SettingsPage from '@/components/servers/custom-server/SettingsPage.vue';
import ManagePlugins from '@/components/servers/custom-server/ManagePlugins.vue';
import DoneModal from '@/components/servers/custom-server/DoneModal.vue';

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  privUser: PrivilegedUser
}>()

let meta = ref<CustomServerMetaInfo>()
let serverInfo = ref<CustomServerInfo>()

interface Step {
  title: string,
  icon: string,
  validator?: () => boolean,
  onEnabled?: () => void,
  onDisabled?: () => void,
}
// TODO: set 5+ recom if sele

const STEPS: Step[] = [
  { title: "Settings", icon: "fa-gear",
    validator: () => formData.value.name != "" && formData.value.game != undefined,
  },
  { title: "Plugins", icon: "fa-puzzle-piece",
    onEnabled: () => {
      if(!meta.value) return
      for(const id of Object.keys(meta.value.plugins)) {
        console.log(id, meta.value.plugins[id], hasFlag(id, SMPluginFlag.Recommended_ExtraPlayers))
        if(hasFlag(id, SMPluginFlag.Recommended_ExtraPlayers)) {
          console.log(id, 'recommended 5+', formData.value.extraPlayers)
          enabledPlugins.value[id] = formData.value.extraPlayers ? true : false
        }
      }
    }
  },
  { title: "Addons", icon: "fa-square-plus" },
  { title: "Review", icon: "fa-circle-info"},
]

// note: l4d_survivor_identity_fix.sp should be required if no issues with non 5+
// note: abm disable if custom epi

let currentStep = ref<number>(1)
let highestStep = ref<number>(0)
let formData = ref<{
  name: string,
  game: { appid: number, title: string},
  extraPlayers: boolean
}>({
  name: "dummy",
  game: {appid:550, title: "Left 4 Dead 2"},
  extraPlayers: true
})
let searchQuery = ref("")
let enabledPlugins = ref<Record<string, boolean>>({})
let enabledAddons = ref<WorkshopItem[]>([])

const form = computed(() => {
  return {
    name: formData.value.name,
    game: formData.value.game.appid,
    extraPlayers: formData.value.extraPlayers,
    enabledPlugins: Object.keys(enabledPlugins.value),
    enabledAddons: Object.keys(enabledAddons.value)
  } as CustomServerForm
})

const canAdvance = computed(() => {
  const step = STEPS[currentStep.value]
  if('validator' in step) return step.validator!()
  return true
})

function setStep(newStepIndex: number) {
  if(!meta.value) return
  const prevStep = currentStep.value
  if(STEPS[prevStep].onDisabled) {
    STEPS[prevStep].onDisabled()
  }

  if(newStepIndex > currentStep.value && !canAdvance.value) return
  newStepIndex = Math.max(Math.min(newStepIndex, STEPS.length - 1), 0)
  const step = STEPS[newStepIndex]
  console.log('new step', step)
  if(step.onEnabled != undefined) {
    step.onEnabled()
  }
  currentStep.value = newStepIndex
  highestStep.value = Math.max(highestStep.value, newStepIndex)
}

function onAddonChange(addonId: string, addon?: WorkshopItem) {
  if(addon != undefined) {
    enabledAddons.value.push(addon)
  } else {
    const indexOf = enabledAddons.value.findIndex((addon) => addon.publishedfileid === addonId)
    if(indexOf > -1) {
      enabledAddons.value.splice(indexOf, 1)
    }
  }
}

async function fetchMeta() {
  const response = await fetch("/api/servers/custom/meta")
  if(response.ok) {
    const json = await response.json()
    meta.value = json
  }
}

function hasFlag(pluginId: string, flag: SMPluginFlag): boolean | null {
  if(!meta.value) return null
  if(!meta.value.plugins[pluginId]) return null
  return meta.value.plugins[pluginId].flags != undefined && (meta.value.plugins[pluginId].flags & flag) == flag
}

onBeforeMount(async() => {
  await fetchMeta()
  for(const [id, data] of Object.entries(meta.value!.plugins)) {
    enabledPlugins.value[id] = (hasFlag(id, SMPluginFlag.Recommended) || hasFlag(id, SMPluginFlag.Required)) ?? false
  }
})
</script>
