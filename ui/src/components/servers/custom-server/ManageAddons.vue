<template>
<div class="box">
  <h4 class="title is-4">Server Addons</h4>
  <p class="">Select the addons you want on the server by clicking on its box. You can always change addons later.</p>
  <p class="">Hover over a box to view the description of the addon</p>
  <br>
  <div class="columns">
    <div class="column is-8">
      <Field icon-left="fa-plus" label="Add / Find Workshop Addon">
        <input v-model="searchQuery" type="text" class="input" placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=0000000000" />
        <p class="help">Enter a workshop url or search for an addon by it's name</p>
      </Field>
    </div>
    <div class="column">

    </div>
  </div>
  <h5 class="title is-5 mb-2">Added Addons</h5>
  <div class="fixed-grid has-2-cols">
    <div class="grid">
      <div v-for="(addon) in filteredAddons" :key="addon.filename" class="cell has-tooltip-right"
        :data-tooltip="addon.tooltip">
        <div :class="['card','mt-2','py-0','px-0',{
                    'is-clickable': true,
                    'has-background-link-light': enabledAddons[addon.filename],
                    // 'has-background-primary': enabledPlugins[pluginId] && hasFlag(pluginId, PluginFlag.Required),
                    'has-background-grey-lighter': !enabledAddons[addon.filename],
                  }]" style="border-radius: 1px; height:100%" @click="toggleAddon(addon.filename)">
          <div class="card-content px-4 py-2">
            <label class="checkbox">
              <input type="checkbox" :checked="enabledAddons[addon.filename]" />
              &nbsp;<strong>{{ addon.name }}</strong>
            </label>
            <!-- <span data-tooltip="This plugin is required and cannot be disabled" class="tag is-danger"
              v-if="plugin.flagKv.required">Required</span>
            <span data-tooltip="This plugin is recommended to be enabled" class="tag is-primary"
              v-else-if="plugin.flagKv.recommended">Recommended</span>
            <span data-tooltip="This plugin is recommended to be enabled when 5+ support is enabled"
              class="tag is-primary"
              v-else-if="plugin.flagKv.recommendedExtraPlayers && formData.extraPlayers">Recommended for 5+</span>
            <span class="tag is-secondary" v-else-if="hasFlag(plugin.id, PluginFlag.Library)">Library</span> -->
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { AddonInfo } from '../../../../../common-types/Share.js';
import Field from '@/components/Field.vue';

let searchQuery = ref()

let enabledAddons = ref<Record<string, boolean>>({})
let addons = ref<AddonInfo[]>()
const filteredAddons = computed(() => {
  if(!addons.value) return []
  return addons.value.map(addon => {
    return {
      ...addon,
      name: addon.workshop?.title ?? addon.filename,
      tooltip: `${addon.filename}\n\n${addon.workshop?.description??''}`
    }
  })
})

async function fetchAddons() {
  const response = await fetch('/api/shares/addons/addons')
  if(response.ok) {
    const json = await response.json()
    addons.value = json.addons
    for(const addon of addons.value!) {
      enabledAddons.value[addon.filename] = false
    }
  }
}

function toggleAddon(addonId: string) {
  if(!addons.value) return
  enabledAddons.value[addonId] = !enabledAddons.value[addonId]
}

onMounted(() => {
  fetchAddons()
})
</script>
