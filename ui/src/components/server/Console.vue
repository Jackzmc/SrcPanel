<template>
<div>
  <div id="console">
    <div class="console-content" v-for="(line, i) of logs" :key="i">
      {{ line }}
    </div>
  </div>
  <Field icon-left="terminal" icon-class="terminal-icon">
    <input class="input terminal-input" v-model="commandInput" placeholder="Enter a command">
  </Field>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import Field from '@/components/Field.vue'

const route = useRoute()
const router = useRouter()

const isLiveViewActive = computed(() => {
  if(liveStatusNextRetryTime.value) return false
  return liveReadyState.value == EventSource.OPEN
})
let liveStatusNextRetryTime = ref<number>()
let errCount = 0
let liveReadyState = ref<number>(0)
let evtSource: EventSource
let retryTimeout: any
let commandInput = ref()

let logs = ref<string[]>([])

const MAX_BACKOFF = 1000 * 60 * 2
function createLogsConnection() {
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
</script>

<style>
#console {
  height: 512px;
  background: black;
  color: white;
  padding: 10px;
  font-style: monospace;
  overflow-y: scroll;
}
.terminal-input::placeholder {
  color: white;
  opacity: 0.8;
}
.terminal-input {
  color: white;
  background: black;
}
.terminal-icon {
  color: white !important;
  opacity: 1.0 !important;
}
</style>
