<template>
  <div>
    <!-- Console Output -->
    <div class="bg-black dark:bg-blue-950 text-white h-80 rounded-t-md p-4 text-xs font-mono">
      <div v-if="logs == undefined">
        <IconText leading-icon="lucide:loader-circle" leading-icon-class="animate-spin" text="Fetching logs..."  class="text-neutral-300" />
      </div>
      <div v-else-if="logs.length === 0" class="text-neutral-300">
        No current log entries. New entries will appear here as they are received.
      </div>
      <span v-for="(entry, i) in logs" :key="i">
        {{ entry }}
      </span>
    </div>
    <!-- Console Input -->
    <div class="flex">
      <UInput
        type="text"
        leading-icon="lucide:terminal"
        placeholder="Enter a command"
        :loading="commandLoading"
        :disabled="loading"
        v-model="commandInput"
        :ui="{ root: 'w-full', base: 'py-2 px-2 rounded-none bg-black dark:bg-blue-950 text-white' }"
        @keyup.enter="sendCommand"
      />
      <UButton leading-icon="lucide:circle-question-mark"
         color="neutral"
        @click="showHelp"
        class="cursor-help rounded-none"
      >Help</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiveRecordCommandResponse } from '@common/Live';
import type { ServerDetailed } from '@common/Server';

const modal = useModal()
const toast = useToast()

const props = defineProps<{
  data: ServerDetailed,
  logs?: string[]
}>()

const commandInput = ref("")
const loading = ref(true)
const commandLoading = ref(false)

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

  // emit("log", `> ${command}`)
  // TODO: copy runCommand
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
    // pushCommandHistory(command)

    // Rcon output is not shown to the main server logs, include here:
    if(!result.body.message) {
      // emit("log", ``)
    } else {
      for(const line of result.body.message.split(/\r?\n/)) {
        // emit("log", line);
      }
    }
  }

  commandLoading.value = false
}
</script>
