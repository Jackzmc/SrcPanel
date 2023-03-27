<template>
<div>
  <h4 class="title is-4">Panel Settings</h4>
  <p class="my-6" v-if="!keyvalues">Fetching panel settings...</p>
  <table v-if="keyvalues" class="table">
    <thead>
      <tr>
        <th>Key</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(data, key) of keyvalues" :key="key">
        <td>
          {{ data.name ?? convertSnakeToHuman(key) }}
          <span class="tags">
            <span class="tag is-info" v-if="data.public" data-tooltip="This is shown to admins and non-admins">Public</span>
            <span class="tag is-dark" v-if="data.type">{{ data.type }}</span>
          </span>
        </td>
        <td>
          <Field  :error="keyvalues[key].error" :success="keyvalues[key].success">
            <input type="text" :class="['input',{'is-danger': keyvalues[key].error}]" v-model="keyvalues[key].formValue" @input="validateKeyvalue(key)">
          </Field>
        </td>
      </tr>
    </tbody>
  </table>
  <a class="button is-success has-tooltip-danger" @click="saveKeyvalue" :disabled="canSave?undefined:true" :data-tooltip="canSaveTooltip">Save Changes</a>
</div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeMount } from 'vue';
import { Keyvalue } from '../../../../server/src/modules/ConfigManager';
import { ApiPanelConfig } from '../../../../server/src/routes/!!privileged/panel.js';
import { notify } from '@kyvg/vue3-notification';
import { request } from '@/js/util';
import { convertSnakeToHuman } from '../../js/util';
import { PanelKeysRecord } from '../../../../server/src/routes/!!privileged/panel';
import Field from '@/components/Field.vue'

const URL_REGEX = new RegExp(/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/)
interface KeyvaluesFormData extends ApiPanelConfig {
  formValue: string,
  error?: string,
  success?: string
}

let keyvalues = ref<Record<Keyvalue, KeyvaluesFormData>>()
let canSave = ref(false)
let canSaveTooltip = ref<string>()
watch(() => keyvalues.value, () => {
  if(!keyvalues.value) return canSave.value = false
  for(const data of Object.values(keyvalues.value)) {
    if(data.error || data.success) {
      canSaveTooltip.value = "Fix all errors before saving"
      return canSave.value = false
    }
    if(data.formValue !== data.value) {
      canSaveTooltip.value = undefined
      return canSave.value = true
    }
  }
  canSaveTooltip.value = "No changes were made"
  return canSave.value = false
}, { deep: true })


function validateKeyvalue(key: string) {
  if(!keyvalues.value) return
  const data = keyvalues.value[key as Keyvalue];
  if(!data) return
  data.error = undefined
  data.success = undefined
  switch(data.type) {
    case "integer":
      if(data.formValue.includes('.') || isNaN(Number(data.formValue))) {
        data.error = "Value is not a valid integer"
      }
      break;
    case "float":
      if(isNaN(Number(data.formValue))) {
        data.error = "Value is not a valid float"
      }
      break;
    case "url":
      if(!URL_REGEX.test(data.formValue)) {
        data.error = "URL is not valid"
      }
      break;
  }
}

async function saveKeyvalue() {
  if(!keyvalues.value || !canSave.value) return
  const keys = keyvalues.value
  let kv: Partial<Record<string, string | null>> = {}
  for(const [key, data] of Object.entries(keys)) {
    if(data.formValue !== data.value)
      kv[key] = keyvalues.value[key as Keyvalue].formValue
      if(kv[key] === "") {
        kv[key] = null
      }
  }
  const response = await request("/api/panel/kv", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(kv)
  }, { title: "Save Error"})

  if(response?.ok) {
    notify({
      type: "success",
      text: "Saved panel configs successfully"
    })
  }
}

async function fetchPanelConfigs() {
  keyvalues.value = undefined
  const response = await request('/api/panel', undefined, { title: "Error fetching configs"})
  if(response?.ok) {
    const { keys }: { keys: PanelKeysRecord } = await response.json()
    let obj: Partial<Record<Keyvalue, KeyvaluesFormData>> = {}
    for(const [key, data] of Object.entries(keys)) {
      obj[key as Keyvalue] = {
        ...data,
        formValue: data.value,
      }
    }
    keyvalues.value = obj as Record<Keyvalue, KeyvaluesFormData>
  } else {
    console.error(response?.statusText)
  }
}

onBeforeMount(() => {
  fetchPanelConfigs()
})
</script>
