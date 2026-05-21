<template>
  <div>
    <!-- Console Output -->
    <div class="bg-black dark:bg-blue-950 text-white h-80 rounded-t-md p-4 text-xs font-mono">
      <div v-if="ws.wsStatus.value == 'connecting'">
        <IconText leading-icon="lucide:loader-circle" leading-icon-class="animate-spin" text="Fetching logs..."  class="text-neutral-300" />
      </div>
      <div v-else-if="ws.logs.value.length === 0" class="text-neutral-300">
        <IconText
          leading-icon="lucide:radio"
          leading-icon-class="animate-pulse"
          text="No logs to show, new entries will appear here as they are received."
          class="text-neutral-300" />
      </div>
      <span class="flex flex-col text-wrap">
        <span v-for="(entry, i) in ws.logs.value" :key="i">
          {{ entry }}
        </span>
      </span>
    </div>
    <!-- Console Input -->
    <div class="flex">
      <UInput
        v-if="data.server.features.performCommands"
        type="text"
        leading-icon="lucide:terminal"
        placeholder="Enter a command"
        :loading="commandLoading"
        :disabled="ws.wsStatus.value != 'connected' || !data.server.features.performCommands"
        v-model="commandInput"
        :ui="{ root: 'w-full', base: 'py-2 px-2 rounded-none bg-black dark:bg-blue-950 text-white' }"
        @keyup.enter="sendCommand"
        :class="commandInputClass"
      />
      <span v-else class='w-full text-sm py-2 px-2  bg-black dark:bg-blue-950 text-white border-2 border-neutral-500'>
        <IconText
          leading-icon="lucide:lock"
          text="Server does not support commands"
          class="text-neutral-300"
        />
      </span>
      <UButton leading-icon="lucide:circle-question-mark"
         color="neutral"
        @click="showHelp"
        class="cursor-help rounded-none"
      >Help</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiveRecordCommandResponse } from '@jzpanel/common/Live';
import type { ServerDetailed } from '@jzpanel/common/Server';
import { IconText } from '#components';
import type { WebsocketExport, WebsocketExportProp, WebsocketStatus } from '~/composables/server/live';

const modal = useModal()
const toast = useToast()
const emit = defineEmits<{
  (e: 'log', msg: string): void
}>()

const props = defineProps<{
  data: ServerDetailed,
  ws: WebsocketExport
}>()

const commandLoading = ref(false)
const commandInputClass = computed(() => {
  if(currentCommandName.value && validCommands.value.has(currentCommandName.value)) {
    return ""
  }
  return "text-error"
})

const currentCommandName = computed(() => {
  if(!commandInput.value) return
  const split = commandInput.value.split(" ")
  return split[0]?.toLowerCase()
})

let commandInput = ref<string>()
let validCommands = ref<Set<string>>(new Set())
let consoleElem = ref()

let commandHistory: string[] = []
let historyIndex: number = -1 // from the bottom of list

function showHelp() {
  modal.promptConfirm({
    title: 'Console Help',
    okShown: false,
    cancelText: 'Close',
    body: `<p>Commands that you would use in chat such as <code>/slay</code> (or publicly <code>!slay</code>) use the <code>sm_</code> codefix in the console. An example command <code>/slay jockey</code> would be <code>sm_slay jockey</code>.
    <br><br>Unknown commands will be shown as red, where known commands will show as white. Some commands may not be marked as known, but you can still attempt to enter them.
    <br><br>Some commands were not decided to run from console and can't be used, this includes any command that shows a menu (/fta, /notesdisconnected, etc). </p>`
  })
}

function jumpToBottom() {
  nextTick(() => {
    consoleElem.value.scrollTop = consoleElem.value.scrollHeight;
  })
}

async function sendCommand() {
  if(!commandInput.value) return
  let command = commandInput.value.trim()
  if(command.length === 0) return
  commandLoading.value = true
  if(command.startsWith("/") || command.startsWith("!")) {
    toast.add({
      color: "info",
      title: "Bad Command",
      description: `/ and ! commands are only used in chat. To enter commands replace them with the sm_ prefix`
    })
    command = "sm_" + command.slice(1)
  }

  emit("log", `> ${command}`)
  commandInput.value = ""
  const result = await request<LiveRecordCommandResponse>(`/api/servers/${props.data.server.id}/cmd`, {
    method: 'POST',
    body: command,
  })
  if('error' in result) {
    toast.add({
      color: "error",
      title: "Command failed",
      description: result.error.message,
    })
  } else if(result.body) {
    pushCommandHistory(command)

    // Rcon output is not shown to the main server logs, include here:
    if(!result.body.message) {
      emit("log", ``)
    } else {
      for(const line of result.body.message.split(/\r?\n/)) {
        emit("log", line);
      }
    }
  }

  commandLoading.value = false
}

function loadHistoryEntry(direction: number) {
  if(direction > 0) {
    // up
    if(Math.abs(historyIndex) < commandHistory.length) {
      historyIndex--
    }
  } else {
    // down
    if(historyIndex < -1) {
      historyIndex++
    }
  }
  commandInput.value = commandHistory.at(historyIndex)
}

function loadCommandHistory() {
  if(localStorage['srcds_console_history']) {
    const list = JSON.parse(localStorage['srcds_console_history'])
    commandHistory = list ?? []
  }
}

function pushCommandHistory(cmd: string) {
  commandHistory.push(cmd)
  historyIndex = 0 // reset index
  localStorage['srcds_console_history'] = JSON.stringify(commandHistory)
}

onMounted(async() => {
  loadCommandHistory()
  // await fetchCommands()
  jumpToBottom()
})
</script>
