<template>
<div class="container">
    <div class="columns">
        <div class="column is-3">
            <h4 class="title is-4">Admin Panel Control</h4>
            <p>{{ serverHealth.currentState }}</p>
            <p>{{ uptime }} uptime</p>
            <p>Node.JS Version {{serverHealth?.versions?.node}}</p>
            <br>
            <a
                :disabled="canUpdate"
                :class="['button', {'is-loading': updateStatus.state === 'CHECKING'}]"
                @click="updateServer">
                Update Server
            </a>
            <p class="has-text-danger" v-if="updateStatus.error">{{updateStatus.error}}</p>
            <p class="has-text-info" v-else-if="updateStatus.upToDate">Server is already up to date.</p>
            <p class="has-text-success" v-else-if="updateStatus.state === 'SUCCESS'">Server has been updated successfully.</p>
        </div>
        <div class="column">
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
    </div>
</div>
</template>

<script setup lang="ts">
import Field from "@/components/Field.vue";
import { PrivilegedUser } from "@/js/User";
import { request } from "@/js/util";
import { notify } from "@kyvg/vue3-notification";
import { ref, computed, onBeforeMount, onActivated, onDeactivated, watch } from "vue"
import { Action, Service } from "../../../../common-types/Privileges";
import { UserData } from "../../../../common-types/User";
import { HealthReport, UpdateState } from "../../../../server/src/routes/!!privileged/admin";
import { ApiPanelConfig, PanelKeysRecord } from '../../../../server/src/routes/!!privileged/panel';
import { KeysType, Keyvalue, KeysRecords } from '../../../../server/src/modules/ConfigManager';
import { convertSnakeToHuman } from '../../js/util';

const URL_REGEX = new RegExp(/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/)

const POLL_SERVER_HEALTH_INTERVAL = 1000 * 60 * 0.5

const props = defineProps<{
  privUser: PrivilegedUser,
  userdata: UserData
}>()

interface KeyvaluesFormData extends ApiPanelConfig {
  formValue: string,
  error?: string,
  success?: string
}

let keyvalues = ref<Record<Keyvalue, KeyvaluesFormData>>()
let serverHealth = ref<Partial<HealthReport>>({})
    let updateStatus = ref<{
  state: UpdateState | "CHECKING" | "SUCCESS",
  error?: string,
  upToDate?: boolean
}>({
  state: "NORMAL",
})

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
  return canSave.value = false
}, { deep: true })

const canUpdate = computed(() => {
  return props.privUser.canPerformAction(Service.PanelAdmin, Action.Edit) && updateStatus.value.state !== "NORMAL" || undefined
})
const uptime = computed(() => {
  const minutes = (serverHealth.value.uptime ?? 0) / 60
  if(minutes < 1.0) return "< 1 minute"
  else if(minutes > 60.0) {
    const hours = minutes / 60
    if(hours > 24) return `${Math.round(hours / 24)} days`
    else return `${hours.toFixed(1)} hours`
  }
  else return `${minutes.toFixed(1)} minutes`
})

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

async function updateServer() {
  updateStatus.value = {
    state: "CHECKING"
  }
  const response = await request('/api/admin/update')
  if(response?.ok) {
    const json = await response.json()
    updateStatus.value.state = "SUCCESS"
    if(!json.success) {
      updateStatus.value.upToDate = true
    }
    notify({
      type: "success",
      text: "Update was successful",
      duration: -1
    })
  } else {
    const json = await response?.json()
    updateStatus.value.error = json?.message
  }
  setTimeout(() => {
    updateStatus.value = {
      state: "NORMAL"
    }
  }, 1000 * 7)
}

async function saveKeyvalue() {
  if(!keyvalues.value) return
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

async function fetchServerHealth() {
  const response = await fetch('/api/admin/health')
  if(response.ok) {
    serverHealth.value = await response.json()
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

onBeforeMount(async () => {
  if(props.privUser.canPerformAction(Service.PanelAdmin, Action.View)) {
    await Promise.all([
      fetchServerHealth(),
      fetchPanelConfigs()
    ])
  }
})
let refreshTimer = ref()
onActivated(() => {
  refreshTimer.value = setInterval(fetchServerHealth, POLL_SERVER_HEALTH_INTERVAL)
})
onDeactivated(() => {
  clearInterval(refreshTimer.value)
  refreshTimer.value = null
})
</script>
