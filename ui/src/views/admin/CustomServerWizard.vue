<template>
<div class="container is-fluid mx-4">
  <div class="block">
    <div class="columns">
      <div class="column is-8" >
          <div class="tabs is-toggle is-fullwidth is-large">
          <ul>
            <li v-for="(step, i) in STEPS" :key="i" :class="{'is-active': currentStep >= i }" >
              <a @click="setStep(i)" :style="{'opacity': (i > highestStep) ? 0.5: undefined, cursor: i > highestStep ? 'not-allowed' : undefined }">
                <Icon :icon="step.icon"></Icon>
                <span>{{ step.title }}</span>
              </a>
            </li>
          </ul>
        </div>
        <div class="box" v-if="currentStep === 0">
          <h4 class="title is-4">Server Settings</h4>
          <Field label="Name">
            <span class="help">Give your server a name</span>
            <br>
            <input class="input" type="text" v-model="formData.name" :placeholder="props.privUser.name + '\'s server'" />
          </Field>
          <br>
          <Field label="Game">
            <span class="help">Select the type of game this server is for</span>
            <br>
            <div class="tabs is-toggle is-medium">
              <ul>
                <li v-for="(display, id) in GAMES" :key="id" :class="{'is-active': formData.game === id }">
                  <a @click="formData.game = id">
                    <span>{{ display }}</span>
                  </a>
                </li>
              </ul>
            </div>
          </Field>
          <br>
          <Field label="Other Settings">
            <label class="checkbox">
              <input type="checkbox" v-model="formData.extraPlayers" />
              Enable 5+ Game support
            </label>
          </Field>
        </div>
        <div class="box" v-else-if="currentStep === 1">
          <h4 class="title is-4">Server Plugins</h4>
          <p class="subtitle is-6">Subtitle</p>
          <div class="grid is-col-min-12">
            <div class="cell" v-for="(data, pluginId) in Plugins" :key="pluginId">
              <div :class="['card','mt-2','py-0','px-0',{
                  'is-clickable': !hasFlag(pluginId, PluginFlag.Required),
                  'has-background-link-light': enabledPlugins[pluginId] && !hasFlag(pluginId, PluginFlag.Required),
                  // 'has-background-primary': enabledPlugins[pluginId] && hasFlag(pluginId, PluginFlag.Required),
                  'has-background-grey-lighter': !enabledPlugins[pluginId],
                }]"
                style="border-radius: 1px; height:100%" @click="togglePlugin(pluginId)"
              >
                <div class="card-content px-4 py-2">
                  <label class="checkbox">
                    <input type="checkbox" v-model="enabledPlugins[pluginId]" :disabled="hasFlag(pluginId, PluginFlag.Required) ?? false" />
                    &nbsp;<strong>{{ data.name ?? pluginId}}</strong>
                  </label>
                  <p class="subtitle is-6 mb-2">
                    v{{ data.version }} - Created by {{data.author}}
                  </p>
                  <span class="tag is-danger" v-if="hasFlag(pluginId, PluginFlag.Required)">Required</span>
                  <span class="tag is-primary" v-else-if="hasFlag(pluginId, PluginFlag.Recommended)">Recommended</span>
                  <span class="tag is-primary" v-else-if="hasFlag(pluginId, PluginFlag.Recommended_ExtraPlayers) && formData.extraPlayers">Recommended for 5+</span>
                  <span class="tag is-secondary" v-else-if="hasFlag(pluginId, PluginFlag.Library)">Library</span>
                </div>
              </div>
            </div>
          </div>
          <div class="columns">
            <div class="column is-4">
              <div class="card has-background-grey-lighter my-2 py-0 px-0">
                <div class="card-content px-4 py-2">
                  <h5 class="title is-5">Admin Panel</h5>
                  <p class="subtitle is-6">
                    v1.0.0 - Created by jackz
                  </p>
                </div>
              </div>
              <div class="card has-background-grey-lighter my-2 py-0 px-0">
                <div class="card-content px-4 py-2">
                  <h5 class="title is-5">Global Bans</h5>
                  <p class="subtitle is-6">
                    v1.0.0 - Created by jackz
                  </p>
                </div>
              </div>
            </div>
            <div class="column is-4">

            </div>
            <div class="column is-4">
              <div class="card has-background-success-light my-2 py-0 px-0">
                <div class="card-content px-4 py-2">
                  <h5 class="title is-5">Admin Panel</h5>
                  <p class="subtitle is-6">
                    v1.0.0 - Created by jackz
                  </p>
                </div>
              </div>
              <div class="card has-background-success-light my-2 py-0 px-0">
                <div class="card-content px-4 py-2">
                  <h5 class="title is-5">Global Bans</h5>
                  <p class="subtitle is-6">
                    v1.0.0 - Created by jackz
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="box" v-else>
          error.
          step = {{currentStep}}
        </div>
        <br>
        <button class="button" @click="setStep(currentStep - 1)" v-if="currentStep > 0">
          <Icon icon="fa-chevron-left">Back</Icon>
        </button>
        <button :class="['button','is-pulled-right',{'is-info': canAdvance}]" @click="setStep(currentStep + 1)" v-if="currentStep < STEPS.length - 1" :disabled="!canAdvance">
          <Icon icon="fa-chevron-right"  text-left="Next"></Icon>
        </button>
      </div>
      <div class="column is-3">
        <div class="box has-background-lighter" style="border-radius: 1px">
          <h4 class="title is-4 has-text-centered">Overview</h4>
          <ul>
            <li><b>Name: </b>{{ formData.name }}</li>
            <li><b>Game: </b>{{ formData.game ? GAMES[formData.game] : '' }}</li>
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
import Plugins_ from '@/assets/plugins.tmp.json'
const Plugins = Plugins_ as Record<string, PluginMeta>

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  privUser: PrivilegedUser
}>()

const GAMES: Record<string, string> = { l4d2: "Left 4 Dead 2" }

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
    validator: () => formData.value.name != "" && formData.value.game != "",
  },
  { title: "Plugins", icon: "fa-puzzle-piece",
    onEnabled: () => {
      for(const id of Object.keys(Plugins)) {
        console.log(id, Plugins[id], hasFlag(id, PluginFlag.Recommended_ExtraPlayers))
        if(hasFlag(id, PluginFlag.Recommended_ExtraPlayers)) {
          console.log(id, 'recommended 5+', formData.value.extraPlayers)
          enabledPlugins.value[id] = formData.value.extraPlayers ? true : false
        }
      }
    }
  },
  { title: "Addons", icon: "fa-square-plus" },
  { title: "Review", icon: "fa-circle-info"},
]

interface CustomServer {
  name: string,
  game: string,
  extraPlayers: boolean
  enabledPlugins: string[],
  enabledAddons: string[]
}
interface PluginMeta {
  version?: string,
  author?: string,
  description?: string,
  name?: string,
  engines: string[],
  includes: string[],
  includesOptional: string[],
  flags?: PluginFlag
}
const enum PluginFlag {
  None,
  Required = 1,
  Recommended = 2,
  Recommended_ExtraPlayers = 4,
  Library = 8
}
// note: l4d_survivor_identity_fix.sp should be required if no issues with non 5+
// note: abm disable if custom epi

let currentStep = ref<number>(1)
let highestStep = ref<number>(0)
let formData = ref({
  name: "dummy",
  game: "left4dead2",
  extraPlayers: true
})
let enabledPlugins = ref<Record<string, boolean>>({})

const form = computed(() => {
  return {
    name: formData.value.name,
    game: formData.value.game,
    extraPlayers: formData.value.extraPlayers,
    enabledPlugins: Object.keys(enabledPlugins),
    enabledAddons: []
  } as CustomServer
})

const canAdvance = computed(() => {
  const step = STEPS[currentStep.value]
  if('validator' in step) return step.validator!()
  return true
})

function setStep(newStepIndex: number) {
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

function togglePlugin(pluginId: string) {
  if(hasFlag(pluginId, PluginFlag.Required)) return
  enabledPlugins.value[pluginId] = !enabledPlugins.value[pluginId]
}
function hasFlag(pluginId: string, flag: PluginFlag): boolean | null {
  if(!Plugins[pluginId]) return null
  return Plugins[pluginId].flags != undefined && (Plugins[pluginId].flags & flag) == flag
}

onBeforeMount(() => {
  for(const [id, data] of Object.entries(Plugins)) {
    enabledPlugins.value[id] = (hasFlag(id, PluginFlag.Recommended) || hasFlag(id, PluginFlag.Required)) ?? false
  }
})
</script>
