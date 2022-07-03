<template>
<Modal active :closable="false">
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">Install Addon
        <span class="tag is-info has-tooltip-bottom is-pulled-right mr-2 is-rounded" data-tooltip="The target share">{{props.share.name}}</span>
      </p>
      <button v-if="downloadingState == 0" class="delete" aria-label="close" @click='close'></button>
    </header>
    <section class="modal-card-body" v-if="downloadingState == 0">
      <div class="field">
        <label class="label">Enter a workshop link</label>
        <div class="control">
          <input class="input" type="text" @input="verifyLink" />
          <p class="help has-text-danger" v-if="!workshopId">
            Not a valid workshop link
          </p>
          <p class="help has-text-info" v-else>ID: {{workshopId}}</p>
        </div>
      </div>
      <div class="field">
        <label class="label">Install To</label>
        <div class="control">
          <div class="select is-multiple">
            <select multiple v-model="installDestinations" class="input">
              <option v-for="dest in props.share.destinations" :key="dest">
                {{dest}}
              </option>
            </select>
            <p class="help has-text-danger" v-if="installDestinations.length == 0">
              At least one destination is needed
            </p>
          </div>
        </div>
      </div>
    </section>
    <section class="modal-card-body" v-else>
      <div class="content">
        <p v-for="(entry, i) in downloadLog" :key="i">
          <span :class="['tag',{'is-link': !entry.error, 'is-danger': entry.error}]">{{entry.state}}</span> {{entry.message}}
        </p>
      </div>
    </section>
    <footer class="modal-card-foot">
      <button v-if="updateDone" class="button is-success" @click="close">Close</button>
      <button v-else-if="showForceDownload" :class="['button','is-info', {'is-loading': downloadingState == 2}]" :disabled="downloadingState == 2|| !workshopId || installDestinations.length == 0" @click="startDownload(true)">Redownload</button>
      <button v-else :class="['button','is-info', {'is-loading': downloadingState == 1}]" :disabled="downloadingState == 1 || !workshopId || installDestinations.length == 0" @click="startDownload(false)">Download</button>
    </footer>
  </div>
</Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import { computed,ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const WORKSHOP_LINK_REGEX = new RegExp(/https:\/\/steamcommunity\.com\/(sharedfiles|workshop)\/filedetails\/\?id=(\d*)/)

const emit = defineEmits(['close'])
const props = defineProps<{
  share: any
}>()
let workshopId = ref<string>("")
let downloadingState = ref(0) // 0: not downloading, 1 : downloading normal, 2 : downloading forced
let installDestinations = ref([])
let downloadLog = ref<{state: string, message: string, error?: boolean}[]>([])
let showForceDownload = ref(false)
let updateDone = ref(false)

function verifyLink(test: any) {
  const match = test.target.value.match(WORKSHOP_LINK_REGEX)
  if(match) workshopId.value = match[2]
}

const route = useRoute()
const router = useRouter()



function startDownload(force = false) {
  downloadingState.value = force ? 2 : 1
  downloadLog.value = []
  const start = Date.now()
  const sse = new EventSource(`/api/shares/${props.share.name}/addons/${workshopId.value}/download?destinations=${installDestinations.value.join(',')}&sse=1` + (force ? '&force=1' : ''))
  // Don't care about see.onerror, will trigger when server closes
  sse.onerror = () => {
    downloadLog.value.push({
      state: "SERVER_ERROR",
      message: "Server returned an unknown error",
      error: true
    })
    sse.close()
  }
  sse.addEventListener('message', event => {
    try {
      const payload = JSON.parse(event.data)
      if(payload.error) {
        if(payload.code === "FILE_EXISTS") {
          showForceDownload.value = true
        }
        downloadLog.value.push({
          state: payload.state || payload.code,
          message: payload.message,
          error: true
        })
      } else if(payload.state === "COMPLETE") {
        sse.close()
        downloadLog.value.push({
          state: "DONE",
          message: `Took ${Math.round((Date.now() - start) / 1000)} seconds. Map will not be playable until the server(s) have restarted. You can restart servers from the 'Server Management' page.`
        })
        if(!showForceDownload.value || force) updateDone.value = true
      } else {
        downloadLog.value.push({
          state: payload.state || payload.code,
          message: payload.message
        })
      }
    } catch(err) {
      console.warn("Got invalid json payload: ", err, " data: ", event.data)
    }
  });
}

function close() {
  emit('close')
}
</script>
