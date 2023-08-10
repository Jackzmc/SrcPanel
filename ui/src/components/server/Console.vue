<template>
<div>
  <div id="console">
    <span v-show="isConnected" class="tag is-danger is-pulled-right" style="position: sticky; top: 0; right: 0;">Live</span>
    <div class="console-content" v-for="(line, i) of logs" :key="i">
      {{ line }}
    </div>
  </div>
  <Field :icon-left="rconSupported ? 'terminal' : 'warning'" :icon-class="rconSupported ? 'has-text-white' : 'has-text-info'">
    <template v-if="rconSupported">
      <input id="terminal-input" class="input terminal-input" v-model="commandInput"
        placeholder="Enter a command" @keyup.enter="runCommand"
        :disabled="isConnected ? undefined : true"
      >
      <datalist id="terminal-input">
        <option v-for="cmd in VALID_COMMANDS" :key="cmd" :value="cmd"></option>
      </datalist>
    </template>
    <input v-else disabled class="input terminal-input" placeholder="Server does not support RCON">
  </Field>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import Field from '@/components/Field.vue'
import { request } from '@/js/util';
import { notify } from '@kyvg/vue3-notification';

const route = useRoute()
const router = useRouter()

const props = defineProps<{
  server: any
}>()

const VALID_COMMANDS = [
  "sm_request",
  "status",
  "sm_status",
  "sm_kick",
  "sm_ban",
  "sm_who",
  "sm",
  "sm_cvar",
  "sm_cvarl"
]

const rconSupported = computed(() => {
  return props.server.info.features.includes('rcon')
})

const isConnected = computed(() => {
  if(liveStatusNextRetryTime.value) return false
  return liveReadyState.value == EventSource.OPEN
})
let liveStatusNextRetryTime = ref<number>()
let liveReadyState = ref<number>(0)
let evtSource: EventSource
let commandInput = ref<string>()

let logs = ref<string[]>([])

async function runCommand() {
  if(!commandInput.value) return
  const command = commandInput.value.trim()
  if(command.length === 0) return
  const response = await request(`/api/servers/${route.params.id}/cmd`, {
    method: "POST",
    body: command
  })
  commandInput.value = undefined
  if(response?.ok) {
    notify({
      type: "success",
      text: await response.text()
    })
  }
}

const MAX_BACKOFF = 1000 * 60 * 2
let errCount = 0
let retryTimeout: any
function createLogsConnection() {
  if(errCount === -1) return // Unloading, do not connect again
  liveReadyState.value = 0
  evtSource = new EventSource(`/api/servers/${route.params.id}/logs`);
  evtSource.onmessage = (event) => {
    errCount = 0
    liveStatusNextRetryTime.value = undefined
    logs.value.push(decodeURIComponent(event.data))
  }
  evtSource.onopen = () => {
    liveReadyState.value =EventSource.OPEN
  }
  evtSource.onerror = (event) => {
    console.error("Disconnected", { errCount })
    errCount++
    evtSource.close()
    liveReadyState.value = EventSource.CLOSED
    // Exponentional backoff:
    const retryTime = Math.min(1000 * (Math.pow(1.5, errCount / 2) + 5), MAX_BACKOFF)
    liveStatusNextRetryTime.value = Date.now() + retryTime
    retryTimeout = setTimeout(() => {
      createLogsConnection()
    }, retryTime)
  }
}
onBeforeMount(async() => {
  createLogsConnection()
})
onUnmounted(() => {
  errCount = -1
  clearTimeout(retryTimeout)
})
</script>

<style>
#console {
  height: 512px;
  background: black;
  color: white;
  padding: 10px;
  font-style: monospace;
  overflow-y: scroll;
  overscroll-behavior-y: contain;
}
.terminal-input::placeholder {
  color: white;
  opacity: 0.8;
}
.terminal-input {
  color: white;
  background: black;
}
</style>
