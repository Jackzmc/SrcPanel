<template>
<div class="box">
  <h4 class="title is-4">Server Addons</h4>
  <p class="">Select the addons you want on the server by clicking on its box. You can always change addons later.</p>
  <p class="">Hover over a box to view the description of the addon</p>
  <br>
  <div class="columns">
    <div class="column is-8">
      <form @submit.prevent="addWorkshopEntry">
        <div class="field is-grouped">
          <p class="control is-expanded has-icons-left">
            <input v-model="searchQuery" type="text" :class="['input',{'is-success': isValidLink, 'is-danger': !isValidLink && searchQuery && searchQuery.length > 0}]"
              placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=0000000000" @key.enter="addWorkshopEntry" />
            <span class="icon is-small is-left">
              <FontAwesomeIcon icon="fa-plus" />
            </span>
          </p>

          <p class="control">
            <button class="button is-info" :disabled="!isValidLink">
              Add
            </button>
          </p>
        </div>
      </form>
    </div>
    <div class="column">

    </div>
  </div>
  <h5 class="title is-5 mb-2">Added Addons</h5>
  <div class="fixed-grid has-2-cols">
    <div class="grid">
      <div v-for="(addon) in filteredAddons" :key="addon.id" class="cell has-tooltip-right"
        :data-tooltip="addon.item?.tooltip">
        <div :class="['card','mt-2','py-0','px-0',{
                    'is-clickable': true,
                    'has-background-link-light': addon.item ? enabledAddons[addon.item?.filename] : false,
                    // 'has-background-primary': enabledPlugins[pluginId] && hasFlag(pluginId, PluginFlag.Required),
                    'has-background-grey-lighter': !addon.error && (!addon.item || !enabledAddons[addon.item.filename]),
                    'has-background-danger-light': addon.error
                  }]" style="border-radius: 1px; height:100%" @click="toggleAddon(addon.id)">
          <div class="card-content px-4 py-2" v-if="addon.item">
            <label class="checkbox">
              <input type="checkbox" :checked="enabledAddons[addon.id]" />
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
          <div class="card-content px-4 py-2" v-else-if="addon.error">
            <h6 class="title is-6">{{ addon.id }}</h6>
            <p>Failed to find addon: {{ addon.error}}</p>
          </div>
          <div class="card-content px-4 py-2" v-else>
            <h6 class="title is-6"><Icon icon="fa-spinner" spin>{{ addon.id }}</Icon></h6>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
const URL_REGEX = new RegExp(/https:\/\/steamcommunity\.com\/sharedfiles\/filedetails\/\?id=(\d+)(&.*)?\/?$/)

import { computed, onMounted, ref } from 'vue';
import { AddonInfo, WorkshopItem } from '../../../../../common-types/Share.js';
import Field from '@/components/Field.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

let searchQuery = ref()

let enabledAddons = ref<Record<string, boolean>>({})
let addonInfo = ref<Record<string, WorkshopItem>>({})
let addons = ref<Record<string, { id: string, item?: WorkshopItem, error?: string }>>({})

const isValidLink = computed(() => {
  return  searchQuery.value && URL_REGEX.test(searchQuery.value)
})

const filteredAddons = computed(() => {
  if(!addons.value) return []
  return Object.entries(addons.value)
    .map(([,addon]) => {
      return {
        ...addon,
        name: addon.item?.title ?? addon.item?.filename ?? addon.id,
        item: addon.item ? {
          ...addon.item,
          tooltip: `${addon.item.filename}\n\n${addon.item.description??''}`
        } : null
      }
    })
})

async function fetchAddons() {
  const response = await fetch('/api/shares/addons/addons')
  if(response.ok) {
    const json = await response.json()
    for(const addon of json.addons) {
      // addItem(addon)
    }
  }
}
// function addItem(addon: WorkshopItem) {
//   enabledAddons.value[addon.filename] = false
//   addons.value.push(addon)
// }

async function addWorkshopEntry() {
  const wsLinkMatch = searchQuery.value.match(URL_REGEX)
  if(wsLinkMatch) {
    searchQuery.value = ""
    addons.value[wsLinkMatch[1]] = {
      id: wsLinkMatch[1],
    }
    const response = await fetch(`/api/shares/workshop/${wsLinkMatch[1]}/details`)
    try {
      if(response.ok) {
        const json = await response.json()
        if(json.item) {
          addons.value[wsLinkMatch[1]].item = json.item
          // addItem(json.item)
        } else {
          addons.value[wsLinkMatch[1]].error = "Item not found"
          setTimeout(() => {
            delete addons.value[wsLinkMatch[1]]
          }, 6000)
        }
      } else {
        addons.value[wsLinkMatch[1]].error = "Server returned error"
        setTimeout(() => {
          delete addons.value[wsLinkMatch[1]]
        }, 6000)
      }
    } catch(err) {
      delete addons.value[wsLinkMatch[1]]
      console.error(err)
      alert("Failed to fetch item details, see console for information")
    }
  } else {
    // const appid = 550
    // const response = await fetch(`/api/shares/workshop/search/${appid}?query=${encodeURIComponent(searchQuery.value)}`)
    // if(response.ok) {
    //   const json = await response.json()
    // }
  }
}

function toggleAddon(addonId: string) {
  if(!addons.value) return
  enabledAddons.value[addonId] = !enabledAddons.value[addonId]
}

onMounted(() => {
  // fetchAddons()
})
</script>
