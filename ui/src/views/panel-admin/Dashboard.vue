<template>
<div class="container is-fluid">
  <Tabs inner-wrapper-class="tabs" :options="{useUrlFragment:false}" @changed="onTabChanged">
    <Tab name="Overview">
      <h4 class="title is-4">Admin Panel Control</h4>
          <p>{{ serverHealth.currentState }}</p>
          <p>{{ uptime }} uptime</p>
          <p>Node.JS Version {{serverHealth?.versions?.node}}</p>
          <br>
          <div class="buttons">
            <a
              :disabled="canUpdate"
              :class="['button', {'is-loading': updateStatus.state === 'CHECKING'}]"
              @click="updateServer">
              Update Server
            </a>
            <a
              :disabled="canUpdate"
              :class="['button']"
              @click="restartServer">
              Restart Server
            </a>
            <a
              :disabled="canUpdate" class="button"
              @click="updateAdmins">
              Update Admins
            </a>

          </div>

          <p class="has-text-danger" v-if="updateStatus.error">{{updateStatus.error}}</p>
          <p class="has-text-info" v-else-if="updateStatus.upToDate">Server is already up to date.</p>
          <p class="has-text-success" v-else-if="updateStatus.state === 'SUCCESS'">Server has been updated successfully.</p>
    </Tab>
    <Tab name="Panel Config">
      <ConfigEditor />
    </Tab>
    <Tab name="Servers">
      <JsonConfigEditor v-if="tab == 'Servers'" filename="servers.json" />
    </Tab>
    <Tab name="Shares">
      <JsonConfigEditor v-if="tab == 'Shares'" filename="shares.json" />
    </Tab>
    <Tab name="Config (Legacy)">
      <JsonConfigEditor v-if="tab == 'Config (Legacy)'" filename="config.json" />
    </Tab>
  </Tabs>
  <br>
</div>
</template>

<script setup lang="ts">
import { PrivilegedUser } from "@/js/User";
import { request } from "@/js/util";
import { notify } from "@kyvg/vue3-notification";
import { ref, computed, onBeforeMount, onMounted, onUnmounted, defineAsyncComponent } from "vue"
import { HealthReport, UpdateState } from "../../../../common-types/Panel.js";
import ConfigEditor from "@/components/panel-admin/ConfigEditor.vue";
//@ts-ignore
import { Tab, Tabs } from 'vue3-tabs-component'
const JsonConfigEditor = defineAsyncComponent(() => import("@/components/panel-admin/JsonConfigEditor.vue"))

const POLL_SERVER_HEALTH_INTERVAL = 1000 * 10

const props = defineProps<{
  privUser: PrivilegedUser,
}>()

let tab = ref<string>()
let serverHealth = ref<Partial<HealthReport>>({})
let updateStatus = ref<{
  state: UpdateState | "CHECKING" | "SUCCESS",
  error?: string,
  upToDate?: boolean
}>({
  state: "NORMAL",
})

const canUpdate = computed(() => {
  return props.privUser.hasPermission("panel.update") && updateStatus.value.state !== "NORMAL" || undefined
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

function onTabChanged(selectedTab: any) {
  tab.value = selectedTab.tab.name
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

async function restartServer() {
  const response = await request('/api/admin/restart')
  if(response?.ok) {
    notify({
      type: "success",
      text: "Restart was successful",
    })
  }
}

async function updateAdmins() {
  const response = await request('/api/admin/update-admins')
  if(response?.ok) {
    notify({
      type: "success",
      text: "Admins have been updated",
    })
  }
}


async function fetchServerHealth() {
  const response = await fetch('/api/admin/health')
  if(response.ok) {
    serverHealth.value = await response.json()
  }
}

onBeforeMount(async () => {
  if(props.privUser.hasPermission("panel.view")) {
    await fetchServerHealth()
  }
})
let refreshTimer = ref()
onMounted(() => {
  refreshTimer.value = setInterval(fetchServerHealth, POLL_SERVER_HEALTH_INTERVAL)
  fetchServerHealth()
})
onUnmounted(() => {
  clearInterval(refreshTimer.value)
  refreshTimer.value = null
})
</script>
