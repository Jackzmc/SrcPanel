<template>
<Modal active :closable="downloadingState == 0">
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">Install Workshop Addon
        <span class="tag is-info has-tooltip-bottom is-pulled-right mr-2 is-rounded" data-tooltip="The target share">{{props.share.id}}</span>
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
        </div>
      </div>
      <template v-if="workshopDetails">
      <br>
        <h4 class="title is-4" >
          {{workshopDetails.title}}
          <span data-tooltip="Workshop Id" class="tag is-dark">{{ workshopId }}</span>
        </h4>
        <p class="subtitle is-6" v-if="isAddonValid"><b>Game: </b>
          <a :href="'https://store.steampowered.com/app/' + workshopDetails.consumer_app_id">
            {{workshopDetails.consumer_app_title}}
          </a>
        </p>
        <p class="subtitle is-6 has-text-danger" v-else>
          Addon is for <b><a :href="'https://store.steampowered.com/app/' + workshopDetails.consumer_app_id">
            {{workshopDetails.consumer_app_title}}
          </a></b>, but only addons for <b><a :href="'https://store.steampowered.com/app/' + props.share.appId">
            {{props.share.appTitle}}
          </a></b> are allowed
        </p>

        <hr>
      </template>
      <div class="field" v-if="isAddonValid">
        <label class="label">Install Destinations</label>
        <div class="field" v-for="dest in props.share.destinations" :key="dest.id">
          <input
            :id="dest.id"
            type="checkbox"
            :value="dest.id"
            class="is-checkradio has-tooltip-right"
            v-model="installDestinations"
          >
          <label :for="dest.id">
            <span v-if="dest.name"><b>{{dest.name}}</b> (<em>{{dest.id}}</em>)</span>
            <span v-else>{{dest.id}}</span>
            &nbsp;<span class="tag is-info has-tooltip-right is-small is-rounded" data-tooltip="Number of servers that share this destination">{{dest.serverIds?.length ?? 0}} Servers</span>
          </label>
        </div>
      </div>
    </section>
    <section class="modal-card-body" v-else>
      <p class="has-text-centered" v-if="downloadLog.length == 0">
        Update in progress, this might take a while...
      </p>
      <div class="content">
        <p v-for="(entry, i) in downloadLog" :key="i">
          <span :class="['tag',{'is-link': !entry.error, 'is-danger': entry.error}]">{{entry.state}}</span> {{entry.message}}
        </p>
      </div>
    </section>
    <footer class="modal-card-foot">
      <template v-if="updateDone||!isAddonValid">
        <button class="button is-success" @click="close">
          Close
        </button>
        <button v-if="isAddonValid" @click="restartServers" :class="['button','is-info', {'is-loading': downloadingState == 3}]">
          Restart Servers
        </button>
      </template>
      <button v-else-if="showForceDownload"
        :class="['button','is-info', {'is-loading': downloadingState == 2}]"
        :disabled="downloadingState == 2|| !workshopId || installDestinations.length == 0"
        @click="startDownload(true)"
      >
        Redownload
      </button>
      <template v-else>
        <button :class="['button','is-info', {'is-loading': downloadingState == 1}]"
          :disabled="downloadingState == 1 || !workshopId || installDestinations.length == 0"
          @click="startDownload(false)"
        >
          Download
        </button>
        <button class="button" @click="close">
          Cancel
        </button>
      </template>
    </footer>
  </div>
</Modal>
</template>

<script setup lang="ts">
// TODO: Resolve workshop id, show appid and title of item
import Modal from '@/components/Modal.vue'
import { computed,ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const WORKSHOP_LINK_REGEX = new RegExp(/https:\/\/steamcommunity\.com\/(sharedfiles|workshop)\/filedetails\/\?id=(\d*)/)

const emit = defineEmits(['close'])
const props = defineProps<{
  share: any
}>()
let workshopId = ref<string>("")
let workshopDetails = ref()
let downloadingState = ref(0) // 0: not downloading, 1 : downloading normal, 2 : downloading forced, 3: restarting servers
let installDestinations = ref([])
let downloadLog = ref<{state: string, message: string, error?: boolean}[]>([])
let showForceDownload = ref(false)
let updateDone = ref(false)

const isAddonValid = computed(() => {
  if(!props.share.appId) return true // Allow all if no appid is set
  if(!workshopId.value) return false // If no file found, dont check
  return workshopDetails.value?.consumer_app_id == props.share.appId
})

async function verifyLink(test: any) {
  const match = test.target.value.match(WORKSHOP_LINK_REGEX)
  if(match) {
    workshopId.value = match[2]
    workshopDetails.value = await getSteamWSDetails(workshopId.value)
  }
}

async function getSteamWSDetails(id: string) {
  const response = await fetch(`/api/shares/workshop/${id}/details`)
  if(response.ok) {
    const json = await response.json()
    return json.result
  } else {
    throw new Error(`${response.statusText}: ${await response.text()}`)
  }
}

// TODO: use router-view for /admin/addons/add
const route = useRoute()
const router = useRouter()

async function restartServers() {
  downloadingState.value = 3
  let totalRejectedCount = 0
  for(const destId of installDestinations.value) {
    const destInfo = props.share.destinations[destId]
    if(destInfo.serverIds) {
      const results = await Promise.allSettled(destInfo.serverIds.map((serverId: string) => restartServer(serverId)))
      const rejectedCount = results.reduce((pv, result) => {
        if(result.status === "rejected") return pv++
        return pv
      }, 0)
      if(rejectedCount > 0) {
        console.error(`${destInfo.id}: ${rejectedCount} / ${destInfo.serverIds.length} servers failed to restart`)
      }
      totalRejectedCount += rejectedCount
    }
  }
  if(totalRejectedCount > 0) {
    alert(`${totalRejectedCount} servers failed to restart, see console for details`)
  }
  downloadingState.value = 0
}

async function restartServer(id: string) {
  const response = await fetch(`/api/servers/${id}/restart`, {
    method: 'POST'
  })
  return response.ok
}

function startDownload(force = false) {
  downloadingState.value = force ? 2 : 1
  downloadLog.value = []
  const start = Date.now()
  const sse = new EventSource(`/api/shares/${props.share.id}/addons/${workshopId.value}/download?destinations=${installDestinations.value.join(',')}&sse=1` + (force ? '&force=1' : ''))
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
