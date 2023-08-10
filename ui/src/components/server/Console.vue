<template>
<div>
  <div id="console">
    <div class="console-content" v-for="(line, i) of logs" :key="i">
      {{ line }}
    </div>
  </div>

  <div class="field has-background-black">
    <p class="control has-icons-left">
      <input class="input has-background-black is-expanded has-text-white" v-model="commandInput" placeholder="Enter a command">
      <Icon icon="terminal" icon-class="has-text-white is-white has-background-white" />
    </p>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router';

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
      createLiveConnection()
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
</style>
