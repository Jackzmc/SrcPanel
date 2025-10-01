<template>
<div v-if="model" class="box">
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
  <div class="fixed-grid has-2-cols">
    <div class="grid">
      <div v-for="(plugin) in filteredPlugins" :key="plugin.id" class="cell has-tooltip-right"
        :data-tooltip="plugin.tooltip">
        <div :class="['card','mt-2','py-0','px-0',{
                    'is-clickable': !hasFlag(plugin.id, SMPluginFlag.Required),
                    'has-background-link-light': model[plugin.id] && !hasFlag(plugin.id, SMPluginFlag.Required),
                    // 'has-background-primary': enabledPlugins[pluginId] && hasFlag(pluginId, PluginFlag.Required),
                    'has-background-grey-lighter': !model[plugin.id],
                  }]" style="border-radius: 1px; height:100%" @click="togglePlugin(plugin.id)">
          <div class="card-content px-4 py-2">
            <label class="checkbox">
              <input type="checkbox" :checked="model[plugin.id]"
                :disabled="hasFlag(plugin.id, SMPluginFlag.Required) ?? false" />
              &nbsp;<strong>{{ plugin.name ?? plugin.id }}</strong>
            </label>
            <p class="subtitle is-6 mb-2">
              v{{ plugin.version }} - Created by {{ plugin.author }}
            </p>
            <p class="subtitle is-6">
              {{ plugin.description }}
            </p>
            <span v-if="plugin.flagKv.required" data-tooltip="This plugin is required and cannot be disabled"
              class="tag is-danger">Required</span>
            <span v-else-if="plugin.flagKv.recommended" data-tooltip="This plugin is recommended to be enabled"
              class="tag is-primary">Recommended</span>
            <span v-else-if="plugin.flagKv.recommendedExtraPlayers && formData.extraPlayers"
              data-tooltip="This plugin is recommended to be enabled when 5+ support is enabled"
              class="tag is-primary">Recommended for 5+</span>
            <!-- <span class="tag is-secondary" v-else-if="hasFlag(plugin.id, PluginFlag.Library)">Library</span> -->
          </div>
        </div>

      </div>
      <div class="cell">
        <div class="card mt-2 py-0 px-0 has-background-primary-light" style="border-radius: 8px; height:100%">
          <div class="card-content px-4 py-2">
            <label class="label">More plugins</label>
            <p class="subtitle is-6">Don't see the plugin you want? For now, you can contact me and I'll add them.</p>
            <p class="subtitle is-6"></p>
            <p></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CustomServerMetaInfo, SMPluginFlag } from '../../../../../common-types/CustomServer.js';
import Field from '@/components/Field.vue';

const model = defineModel<Record<string, boolean>>()

const props = defineProps<{
  formData: {
    name: string,
    game: { appid: number, title: string},
    extraPlayers: boolean
  },
  meta: CustomServerMetaInfo
}>()

let searchQuery = ref<string>("")

const filteredPlugins = computed(() => {
  if(!props.meta || !model.value) return []
  const query = searchQuery.value.toLowerCase()
  return Object.entries(props.meta.plugins)
    .filter(([id, data]) => {
      if(searchQuery.value != "") {
        if(!id.includes(query) && (!data.name || !data.name?.toLocaleLowerCase().includes(query))) return false
      }
      if(!data.flags) return true
      return model.value![id] || (~data.flags & SMPluginFlag.Library)
    })
    .map(([id, data]) => {
      const flagKv = {
        required: hasFlag(id, SMPluginFlag.Required),
        recommended: hasFlag(id, SMPluginFlag.Recommended),
        recommendedExtraPlayers: hasFlag(id, SMPluginFlag.Recommended_ExtraPlayers)
      }

      return {
        id,
        ...data,
        flagKv,
        tooltip: `${id} ${model.value![id] ? '(enabled)' : ''}\n\n${data.description??''}`
      }
    })
})

function togglePlugin(pluginId: string) {
  const plugin = props.meta!.plugins[pluginId]
  if(!plugin) return
  if(hasFlag(pluginId, SMPluginFlag.Required)) return
  model.value![pluginId] = !model.value![pluginId]
  for(const required of plugin.includes) {
    togglePlugin(required)
  }
}
function hasFlag(pluginId: string, flag: SMPluginFlag): boolean | null {
  if(!props.meta) return null
  if(!props.meta.plugins[pluginId]) return null
  return props.meta.plugins[pluginId].flags != undefined && (props.meta.plugins[pluginId].flags & flag) == flag
}
</script>
