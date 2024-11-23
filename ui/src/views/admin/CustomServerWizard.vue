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
          <p class="">Select the plugins you want on the server by clicking on its box. You can always change plugins later.</p>
          <p class="">Some plugins are required and cannot be disabled, others are recommended</p>
          <p class="">Hover over a box to view the description of the plugin</p>
          <br>
          <div class="columns">
            <div class="column">
              <Field icon-left="fa-search">
                <input v-model="searchQuery" type="text" class="input" placeholder="Search for a plugin" />
              </Field>
            </div>
            <div class="column">

            </div>
          </div>
          <div class="fixed-grid has-3-cols">
            <div class="grid">
              <div v-for="(plugin) in filteredPlugins" :key="plugin.id"
                class="cell has-tooltip-right" :data-tooltip="plugin.tooltip"
              >
                <div :class="['card','mt-2','py-0','px-0',{
                    'is-clickable': !hasFlag(plugin.id, PluginFlag.Required),
                    'has-background-link-light': enabledPlugins[plugin.id] && !hasFlag(plugin.id, PluginFlag.Required),
                    // 'has-background-primary': enabledPlugins[pluginId] && hasFlag(pluginId, PluginFlag.Required),
                    'has-background-grey-lighter': !enabledPlugins[plugin.id],
                  }]"
                  style="border-radius: 1px; height:100%" @click="togglePlugin(plugin.id)"
                >
                  <div class="card-content px-4 py-2">
                    <label class="checkbox">
                      <input type="checkbox"  :checked="enabledPlugins[plugin.id]" :disabled="hasFlag(plugin.id, PluginFlag.Required) ?? false" />
                      &nbsp;<strong>{{ plugin.name ?? plugin.id}}</strong>
                    </label>
                    <p class="subtitle is-6 mb-2">
                      v{{ plugin.version }} - Created by {{plugin.author}}
                    </p>
                    <span data-tooltip="This plugin is required and cannot be disabled" class="tag is-danger" v-if="plugin.flagKv.required">Required</span>
                    <span data-tooltip="This plugin is recommended to be enabled" class="tag is-primary" v-else-if="plugin.flagKv.recommended">Recommended</span>
                    <span data-tooltip="This plugin is recommended to be enabled when 5+ support is enabled" class="tag is-primary" v-else-if="plugin.flagKv.recommendedExtraPlayers && formData.extraPlayers">Recommended for 5+</span>
                    <!-- <span class="tag is-secondary" v-else-if="hasFlag(plugin.id, PluginFlag.Library)">Library</span> -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ManageAddons v-else-if="currentStep === 2" @add-item="onAddonChange" @del-item="onAddonChange" />
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
            <li><b>Name: </b>{{ form.name }}</li>
            <li><b>Game: </b>{{ form.game ? GAMES[form.game] : '' }}</li>
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
import Plugins_ from '@/assets/plugins.tmp.json'
import ManageAddons from '@/components/servers/custom-server/ManageAddons.vue';
import { WorkshopItem } from '../../../../common-types/Share.js';
import PluginFeature from '../../../../server/src/modules/servers/features/Plugin';
import { SMPluginMeta, SMPluginFlag } from '../../../../common-types/CustomServer.ts'
const Plugins = Plugins_ as Record<string, PluginMeta>

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  privUser: PrivilegedUser
}>()

// TODO: use appids.json, record appid as key
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
// note: l4d_survivor_identity_fix.sp should be required if no issues with non 5+
// note: abm disable if custom epi

let currentStep = ref<number>(1)
let highestStep = ref<number>(0)
let formData = ref({
  name: "dummy",
  game: "left4dead2",
  extraPlayers: true
})
let searchQuery = ref("")
let enabledPlugins = ref<Record<string, boolean>>({})
let enabledAddons = ref<WorkshopItem[]>([])

const filteredPlugins = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return Object.entries(Plugins)
    .filter(([id, data]) => {
      if(searchQuery.value != "") {
        if(!id.includes(query) && (!data.name || !data.name?.toLocaleLowerCase().includes(query))) return false
      }
      if(!data.flags) return true
      return enabledPlugins.value[id] || (~data.flags & PluginFlag.Library)
    })
    .map(([id, data]) => {
      const flagKv = {
        required: hasFlag(id, PluginFlag.Required),
        recommended: hasFlag(id, PluginFlag.Recommended),
        recommendedExtraPlayers: hasFlag(id, PluginFlag.Recommended_ExtraPlayers)
      }

      return {
        id,
        ...data,
        flagKv,
        tooltip: `${id} ${enabledPlugins.value[id] ? '(enabled)' : ''}\n\n${data.description??''}`
      }
    })
})

const form = computed(() => {
  return {
    name: formData.value.name,
    game: formData.value.game,
    extraPlayers: formData.value.extraPlayers,
    enabledPlugins: Object.keys(enabledPlugins.value),
    enabledAddons: Object.keys(enabledAddons.value)
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
  const plugin = Plugins[pluginId]
  if(!plugin) return
  if(hasFlag(pluginId, PluginFlag.Required)) return
  enabledPlugins.value[pluginId] = !enabledPlugins.value[pluginId]
  for(const required of plugin.includes) {
    togglePlugin(required)
  }
}
function hasFlag(pluginId: string, flag: PluginFlag): boolean | null {
  if(!Plugins[pluginId]) return null
  return Plugins[pluginId].flags != undefined && (Plugins[pluginId].flags & flag) == flag
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

onBeforeMount(() => {
  for(const [id, data] of Object.entries(Plugins)) {
    enabledPlugins.value[id] = (hasFlag(id, PluginFlag.Recommended) || hasFlag(id, PluginFlag.Required)) ?? false
  }
})
</script>
