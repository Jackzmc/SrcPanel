<template>
<div>
  <div id="console" ref="consoleElem">
    <div class="console-content" v-for="(line, i) of logs" :key="i">
      {{ line }}
    </div>
    <span v-if="logs.length === 0">
      <Icon icon="fa-spinner" spin><em>No log entries currently, this will update automatically.</em></Icon>
    </span>
  </div>
  <Field :icon-left="commandInputSupported ? 'terminal' : 'warning'" :icon-class="commandInputSupported ? 'has-text-white' : 'has-text-info'">
    <template v-if="commandInputSupported">
      <input id="terminal-input" :class="['input','terminal-input',commandClass]" v-model="commandInput"
        placeholder="Enter a command" @keyup.enter="runCommand"
      >
      <datalist id="terminal-input">
        <option v-for="cmd in validCommands" :key="cmd" :value="cmd"></option>
      </datalist>
    </template>
    <input v-else disabled class="input terminal-input" placeholder="Command support is not available at this time">
  </Field>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount, onUnmounted, nextTick, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Field from '@/components/Field.vue'
import { request } from '@/js/util';
import { notify } from '@kyvg/vue3-notification';
import { ServerInfo } from '../../../../common-types/Server';
import { LiveRecordCommandResponse } from '../../../../common-types/Live';

const MAX_LOGS_LINES = 350

const route = useRoute()
const router = useRouter()

const emit = defineEmits(["log"])

const props = defineProps<{
  server: ServerInfo,
  logs: string[]
}>()

const commandInputSupported = computed(() => {
  return props.server.features.performCommands
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

let commandInput = ref<string>()
let validCommands = ref<Set<string>>(new Set())
let consoleElem = ref()

async function runCommand() {
  if(!commandInput.value) return
  let command = commandInput.value.trim()
  if(command.length === 0) return
  if(command.startsWith("/") || command.startsWith("!")) {
    notify({
      type: "info",
      title: "Bad Command",
      text: `/ and ! commands are only used in chat. To enter commands replace them with the sm_ prefix`
    })
    command = "sm_" + command.slice(1)
  }

  emit("log", `> ${command}`)
  commandInput.value = undefined
  const response = await request(`/api/servers/${route.params.id}/cmd`, {
    method: "POST",
    body: command
  })

  if(response?.ok) {
    const json: LiveRecordCommandResponse = await response.json()
    // Rcon output is not shown to the main server logs, include here:
    if(!json.message) {
      emit("log", ``)
    } else {
      for(const line of json.message.split(/\r?\n/)) {
        emit("log", line);
      }
    }
  }
}

defineExpose({ jumpToBottom })

function jumpToBottom() {
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

  // TODO: fetch via appid?
  await getCommands("550_commands")
  await getCommands("extra_commands")
}

async function getCommands(filename: string) {
  try {
    const response = await fetch(`/data/${filename}.txt?t=${BUILD_TIMESTAMP}`)
    const commands = await response.text()
    for(const command of commands.split(/\r?\n/)) {
      if(command.startsWith("#")) continue
      validCommands.value.add(command)
    }
  } catch(err) {
  }
}

onMounted(async() => {
  // createLogsConnection()
  await fetchCommands()
})
onUnmounted(() => {
})
</script>

<style scoped>
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
.console-content {
  white-space: pre-wrap;
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
