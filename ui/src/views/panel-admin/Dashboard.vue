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
        <div class="column is-5">
          <ConfigEditor />
        </div>
    </div>
    <SharesEditor />
</div>
</template>

<script setup lang="ts">
import { PrivilegedUser } from "@/js/User";
import { request } from "@/js/util";
import { notify } from "@kyvg/vue3-notification";
import { ref, computed, onBeforeMount, onActivated, onDeactivated, watch } from "vue"
import { Action, Service } from "../../../../common-types/Privileges";
import { UserData } from "../../../../common-types/User";
import { HealthReport, UpdateState } from "../../../../server/src/routes/!!privileged/admin";
import ConfigEditor from "@/components/panel-admin/ConfigEditor.vue";
import SharesEditor from "@/components/panel-admin/SharesEditor.vue";

const POLL_SERVER_HEALTH_INTERVAL = 1000 * 60 * 0.5

const props = defineProps<{
  privUser: PrivilegedUser,
  userdata: UserData
}>()

let serverHealth = ref<Partial<HealthReport>>({})
    let updateStatus = ref<{
  state: UpdateState | "CHECKING" | "SUCCESS",
  error?: string,
  upToDate?: boolean
}>({
  state: "NORMAL",
})

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

async function fetchServerHealth() {
  const response = await fetch('/api/admin/health')
  if(response.ok) {
    serverHealth.value = await response.json()
  }
}

onBeforeMount(async () => {
  if(props.privUser.canPerformAction(Service.PanelAdmin, Action.View)) {
    await fetchServerHealth()
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
