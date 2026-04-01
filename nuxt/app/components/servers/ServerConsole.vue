<template>
  <div>
    <div class="bg-black dark:bg-blue-950 text-white h-80 rounded-t-md p-4 text-xs font-mono">
      <div>
        <IconText leading-icon="lucide:loader-circle" leading-icon-class="animate-spin" text="Fetching logs..." />
      </div>
      <div>
        No current log entries. New entries will appear here as they are received.
      </div>


    </div>
    <div class="flex">
      <UInput
        type="text"
        leading-icon="lucide:terminal"
        placeholder="Enter a command"
        :loading="loading"
        :disabled="loading"
        :ui="{ root: 'w-full', base: 'py-2 px-2 rounded-none bg-black dark:bg-blue-950 text-white' }"
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
import type { ServerDetailed } from '@common/Server';

const modal = useModal()

const props = defineProps<{
  data: ServerDetailed
}>()

const loading = ref(true)

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
</script>
