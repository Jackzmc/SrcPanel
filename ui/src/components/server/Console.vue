<template>
<div>
  <div id="console" ref="consoleElem">
    <span v-show="isConnected" class="tag is-danger is-pulled-right" style="position: sticky; top: 0; right: 0;">Live</span>
    <div class="console-content" v-for="(line, i) of logs" :key="i">
      {{ line }}
    </div>
  </div>
  <Field :icon-left="rconSupported ? 'terminal' : 'warning'" :icon-class="rconSupported ? 'has-text-white' : 'has-text-info'">
    <template v-if="rconSupported">
      <input id="terminal-input" :class="['input','terminal-input',commandClass]" v-model="commandInput"
        placeholder="Enter a command" @keyup.enter="runCommand"
        :disabled="isConnected ? undefined : true"
      >
      <datalist id="terminal-input">
        <option v-for="cmd in validCommands" :key="cmd" :value="cmd"></option>
      </datalist>
    </template>
    <input v-else disabled class="input terminal-input" placeholder="Server does not support RCON">
  </Field>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import Field from '@/components/Field.vue'
import { request } from '@/js/util';
import { notify } from '@kyvg/vue3-notification';

const MAX_LOGS_LINES = 350

const route = useRoute()
const router = useRouter()

const props = defineProps<{
  server: any
}>()

const rconSupported = computed(() => {
  return props.server.info.features.includes('rcon')
})

const isConnected = computed(() => {
  if(liveStatusNextRetryTime.value) return false
  return liveReadyState.value == EventSource.OPEN
})

const commandClass = computed(() => {
  if(currentCommandName.value && validCommands.value.has(currentCommandName.value)) {
    return ""
  }
  return "has-text-danger"
})

const currentCommandName = computed(() => {
  if(!commandInput.value) return
  const split = commandInput.value.split(" ")
  return split[0].toLowerCase()
})

let liveStatusNextRetryTime = ref<number>()
let liveReadyState = ref<number>(0)
let evtSource: EventSource
let commandInput = ref<string>()
let logs = ref<string[]>([])
let validCommands = ref<Set<string>>(new Set())
let consoleElem = ref()

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
    const text = await response.text()
    // Rcon output is not shown to the main server logs, include here:
    for(const line of text.split(/\r?\n/)) {
      pushLine(line)
    }
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
    pushLine(event.data)
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

function pushLine(line: string) {
  logs.value.push(decodeURIComponent(line))
  if(logs.value.length > MAX_LOGS_LINES) logs.value = logs.value.splice(0, 1)
  // Potentionally helps fix partial end of logs scroll
  nextTick(() => {
    consoleElem.value.scrollTop = consoleElem.value.scrollHeight;
  })
}

async function fetchCommands() {
  try {
    const response = await fetch(`/data/commands.json?t=${BUILD_TIMESTAMP}`)
    const json = await response.json()
    if(!json) return

    for(const group in json) {
      for(const command of json[group].commands) {
        // skip any official commands, the fetch below will get them:
        if(!command.consoleOnly) continue

        const split = command.command.trim().split(' ')
        validCommands.value.add(`sm_${split[0]}`)
      }
    }
  } catch(err) {
    console.error('could not fetch /data/commands.json', err)
  }

  try {
    const response = await fetch(`/data/550_commands.txt?t=${BUILD_TIMESTAMP}`)
    const commands = await response.text()
    for(const command of commands.split(/\r?\n/)) {
      validCommands.value.add(command)
    }
  } catch(err) {
    console.error('could not fetch /data/commands.json', err)
  }
}

onBeforeMount(async() => {
  createLogsConnection()
  await fetchCommands()
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
  scroll-snap-type: y mandatory;
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
