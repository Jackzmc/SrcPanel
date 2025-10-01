<template>
<Modal active :closable="downloadState == DownloadState.Idle">
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">Install Workshop Addon
        <span class="tag is-info has-tooltip-bottom is-pulled-right mr-2 is-rounded" data-tooltip="The target share">{{ props.share.id }}</span>
      </p>
      <button v-if="downloadState == DownloadState.Idle || downloadState == DownloadState.PromptRedownload" class="delete" aria-label="close" @click='close'></button>
    </header>
    <section v-if="downloadState == DownloadState.Idle" class="modal-card-body">
      <div class="field">
        <label class="label">Enter a workshop link</label>
        <div class="control">
          <input v-model="link" class="input" type="text" placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=######" @input="verifyLinkDebounce" />
          <p v-if="!workshopId" class="help has-text-danger">
            Not a valid steam workshop url
          </p>
        </div>
      </div>
      <template v-if="workshopDetails">
      <br>
        <h4 class="title is-4">
          {{ workshopDetails.item.title }}
          <span data-tooltip="Workshop Id" class="tag is-dark">{{ workshopId }}</span>
        </h4>
        <p v-if="isAddonValid" class="subtitle is-6">
          <template v-if="workshopDetails.type === 'collection'">
            Collection -
          </template>
          For app
          <b><a :data-tooltip="workshopDetails.item.consumer_app_id" :href="'https://store.steampowered.com/app/' + workshopDetails.item.consumer_app_id">
            {{ workshopDetails.item.consumer_app_title }}
          </a></b>
        </p>
        <p v-else-if="workshopDetails.item.result === 9" class="subtitle is-6"><b>Game: </b>
          Addon is either private, friends-only, or does not exist.
        </p>
        <p v-else class="subtitle is-6 has-text-danger">
          Addon is for <b><a :href="'https://store.steampowered.com/app/' + workshopDetails.item.consumer_app_id">
            {{ workshopDetails.item.consumer_app_title }}
          </a></b>, but only addons for <b><a :href="'https://store.steampowered.com/app/' + props.share.appid">
            {{ props.share.appTitle }}
          </a></b> are allowed
        </p>

        <hr>
      </template>
      <p v-if="!workshopDetails && workshopId" class="has-text-centered is-size-5 mt-2">
        <span v-if="inputState == InputState.FetchError" class="has-text-danger">
          Could not fetch workshop item
        </span>
        <Icon v-else icon="fa-solid fa-spinner" spin>
          <span class="ml-2">Fetching Workshop Item</span>
        </Icon>
      </p>
      <div v-if="inputState === InputState.ChoosingChildren && workshopDetails?.type === 'collection'" class="field">
        <label class="label">Select collection children</label>
        <div v-for="child in workshopDetails.children" :key="child.publishedfileid" class="field">
          <input
            :id="child.publishedfileid"
            v-model="acceptedChildren"
            type="checkbox"
            :value="child.publishedfileid"
            class="is-checkradio has-tooltip-right"
          >
          <label :for="child.publishedfileid">
            <b><a :href="getWorkshopUrl(child.publishedfileid)" target="_blank">
              {{ child.title }}
            </a></b>
            &nbsp;<span class="tag is-info has-tooltip-right is-small is-rounded">{{ formatSize(child.file_size) }} </span>
          </label>
        </div>
      </div>
      <div v-else-if="inputState === InputState.ChoosingDestinations" class="field">
        <label class="label">Install To:</label>
        <div v-for="(dest, id) in props.share.destinations" :key="id" class="field">
          <input
            :id="id"
            v-model="installDestinations"
            type="checkbox"
            :value="id"
            class="is-checkradio has-tooltip-right"
          >
          <label :for="id">
            <span v-if="dest.name"><b>{{ dest.name }}</b> (<em>{{ id }}</em>)</span>
            <span v-else>{{ id }}</span>
            &nbsp;<span class="tag is-info has-tooltip-right is-small is-rounded" data-tooltip="Number of servers that share this destination">{{ dest.serverIds?.length ?? 0 }} Servers</span>
          </label>
        </div>
      </div>
    </section>
    <section v-else class="modal-card-body">
      <p v-if="downloadLog.length == 0" class="has-text-centered">
        Update in progress, this might take a while...
      </p>
      <div class="content">
        <h4 class="title">Downloads</h4>
        <div v-if="Object.keys(downloads).length > 0" class="list has-visible-pointer-controls">
          <div v-for="(download, id) in downloads" :key="id" class="list-item">
            <div class="list-item-content">
              <div class="list-item-title"><a :href="download.url"><b>{{ download.entryTitle }}</b></a></div>
              <div class="list-item-description">
                <progress :class="['progress', {'is-success': download.progress >= 1, 'is-info': download.progress < 1 }]"
                  :max="download.totalBytes" :value="download.currentBytes"
                >{{ (download.progress * 100).toFixed(0) }}%</progress>
              </div>
            </div>
            <div class="list-item-controls">
              <span v-if="download.progress >= 1" class="tag is-pulled-right is-success">{{ formatSize(download.currentBytes) }}</span>
              <span v-else class="tag is-pulled-right is-info">{{ formatSize(download.currentBytes) }} / {{ formatSize(download.totalBytes) }}</span>
            </div>
          </div>
        </div>
        <br>
        <h4 class="title">Logs</h4>
        <p v-for="(entry, i) in downloadLog" :key="i">
          <span :class="['tag',{'is-link': !entry.error&&!entry.success, 'is-danger': entry.error, 'is-success': entry.success}]">
            {{ entry.state }}
          </span>&nbsp;
          <!-- eslint-disable-next-line vue/no-v-html -- from server -->
          <span v-html="entry.message" />
          <router-link v-if="downloadState == DownloadState.PromptRedownload && entry.state == 'INFO'"
            :to="{name: 'file-info', params: {id: share.id, filename: entry.filename}}"
          >&nbsp;View existing addon</router-link>
        </p>
      </div>
    </section>
    <footer class="modal-card-foot">
      <div class="buttons">
        <template v-if="downloadState == DownloadState.Done || !isAddonValid">
          <button v-if="inputState == InputState.FetchError" class="button is-info" @click="retryDownload">
            Retry
          </button>
          <button class="button is-success" @click="close">
            Close
          </button>

          <button v-if="isAddonValid" :class="['button','is-info', {'is-loading': downloadState == DownloadState.RestartingServers }]" @click="restartServers">
            Restart Servers
          </button>
        </template>
        <template v-else-if="downloadState == DownloadState.PromptRedownload">
          <button
            class="button is-info"
            @click="startDownload(true)"
          >
            Redownload
          </button>
          <button class="button" @click="close">
              Cancel
            </button>
        </template>
        <template v-else-if="inputState == InputState.ChoosingChildren">
          <button :class="['button','is-info']"
            :disabled="acceptedChildren.length === 0"
            @click="acceptChildren()"
          >
            Install Items
          </button>
          <button class="button" @click="close">
            Cancel
          </button>
        </template>
        <template v-else>
          <button :class="['button','is-info', {'is-loading': downloadState == DownloadState.Downloading }]"
            :disabled="downloadState == DownloadState.Downloading || !workshopId || installDestinations.length == 0"
            @click="startDownload(false)"
          >
            Download & Install
          </button>
          <!-- <button class="button" @click="close">
            Cancel
          </button> -->
        </template>
      </div>
    </footer>
  </div>
</Modal>
</template>

<script setup lang="ts">
// TODO: Resolve workshop id, show appid and title of item
import Modal from '@/components/Modal.vue'
import { computed, ref, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotification } from "@kyvg/vue3-notification";
import { ExtendedShareInfo, ShareInfo, DetailsResponse, DetailWorkshopItem } from '../../../../../common-types/Share';
import { formatSize, request, restartServer } from '@/js/util.js'
import debounce from '@/js/debounce.js';

const { notify }  = useNotification()

enum DownloadState {
  Idle,
  Downloading,
  PromptRedownload,
  RestartingServers,
  Done
}
enum InputState {
  Idle,
  ChoosingChildren,
  ChoosingDestinations,
  FetchError
}

const WORKSHOP_LINK_REGEX = new RegExp(/https:\/\/steamcommunity\.com\/(sharedfiles|workshop)\/filedetails\/\?id=(\d*)/)

const emit = defineEmits(['close', 'refresh'])
const props = defineProps<{
  share: ExtendedShareInfo
}>()
let link = ref()
let workshopId = ref<string>("")
let workshopDetails = ref<DetailWorkshopItem>()
let acceptedChildren = ref()
let downloadState = ref<DownloadState>(DownloadState.Idle)
let inputState = ref<InputState>(InputState.Idle)
let installDestinations = ref<string[]>([])
let downloadLog = ref<{state: string, message: string, error?: boolean, success?: boolean, filename?: string}[]>([])
let downloads = ref<Record<string, { entryTitle: string, url: string, totalBytes: number, currentBytes: number, progress: number }>>({})

const isAddonValid = computed(() => {
  if(!props.share.appid) return true // Allow all if no appid is set
  if(!workshopId.value) return false // If no file found, dont check
  return workshopDetails.value?.item.consumer_app_id == props.share.appid
})

async function verifyLink(test: any) {
  inputState.value = InputState.Idle
  const match = test.target.value.match(WORKSHOP_LINK_REGEX)
  if(match) {
    workshopId.value = match[2]
    workshopDetails.value = undefined // reset it for comparison used in template
    const response = await getSteamWSDetails(workshopId.value)
    if(response) {
      if(response.item.consumer_app_id != props.share.appid) return
      if(response.type === 'collection') {
        inputState.value = InputState.ChoosingChildren
        acceptedChildren.value = response.children.map(child => child.publishedfileid)
      } else {
        inputState.value = InputState.ChoosingDestinations
        acceptedChildren.value = undefined
      }
      workshopDetails.value = response
    }
  }
}
const verifyLinkDebounce = debounce(verifyLink, 400)

async function getSteamWSDetails(id: string): Promise<DetailWorkshopItem | null> {
  const response = await request(`/api/shares/workshop/${id}/details`, undefined, {
    title: "Error fetching workshop item"
  })
  if(response?.ok) {
    const json: DetailsResponse = await response.json()
    if(!json.item) return null
    return json
  } else {
    inputState.value = InputState.FetchError
    return null
  }
}

// TODO: use router-view for s/add
const route = useRoute()
const router = useRouter()

async function restartServers() {
  downloadState.value = DownloadState.RestartingServers
  let count = {
    total: 0,
    success: 0,
    rejected: 0
  }
  for(const destId of installDestinations.value) {
    const response = await fetch(`/api/shares/${props.share.id}/destinations/${destId}/restart-servers`, {
      method: "POST"
    })
    if(response.ok) {
      const json = await response.json()
      count.total += json.success.length + json.rejected.length
      count.success += json.success.length
      count.rejected += json.failed.length
    } else {
      notify({
        type: "error",
        title: "Failed to restart destination",
        text: destId
      })
    }
  }
  console.error(`$${count.success} / ${count.total} servers restarted`)

  let msg = `${count.success} / ${count.total} servers restarted`
  if(count.rejected > 0) msg += "<br>See the console for more information"

  notify({
    type: count.rejected > 0 ? "error" : "success",
    title: "Server Restarted",
    text: msg,
  })
  close()
  downloadState.value = DownloadState.Idle
}

function retryDownload() {
  downloadState.value = DownloadState.Idle
  verifyLink(link.value)
}

function acceptChildren() {
  inputState.value = InputState.ChoosingDestinations
}

function startDownload(force = false) {
  downloadState.value = DownloadState.Downloading
  downloadLog.value = []
  const start = Date.now()
  const query = new URLSearchParams();
  query.append("destinations", installDestinations.value.join(','))
  query.append("sse", "1")
  if(force) query.append("force", "1")
  if(acceptedChildren.value != null) query.append("children", acceptedChildren.value.join(','))
  const sse = new EventSource(`/api/shares/${props.share.id}/addons/workshop/${workshopId.value}/download?${query.toString()}`)
  // Don't care about see.onerror, will trigger when server closes
  sse.onerror = () => {
    downloadLog.value.push({
      state: "SERVER_ERROR",
      message: "Lost connection with server, please try again.",
      error: true
    })
    sse.close()
  }
  sse.addEventListener('message', event => {
    try {
      const payload = JSON.parse(event.data)
      if(payload.error) {
        if(payload.code === "FILE_EXISTS") {
          console.debug("File already exist, asking for confirmation")
          sse.close()
          downloadState.value = DownloadState.PromptRedownload
          downloadLog.value.push({
            state: payload.state || payload.code,
            filename: payload.filename,
            message: "Addon was already downloaded. Press the redownload button to download a fresh version",
            error: true
          })
        } else {
          downloadLog.value.push({
            state: payload.state || payload.code,
            message: payload.message,
            error: true
          })
        }
      } else if(payload.state === "COMPLETE") {
        sse.close()
        downloadLog.value.push({
          state: "DONE",
          message: `Took ${Math.round((Date.now() - start) / 1000)} seconds. Maps will not be playable until the server(s) have restarted. You can restart individual servers from the 'Server Management' page.`
        })
        // If no force prompt shown or this was a force download, then we are done.
        if(downloadState.value == DownloadState.Downloading || force) downloadState.value = DownloadState.Done
        else console.debug("COMPLETE on state=",downloadState.value)

      } else if(payload.state === "DOWNLOAD_PROGRESS") {
        if(!downloads.value[payload.entry]) return console.warn(`Progress update for download that we don't know: ${payload.entry}`)
        downloads.value[payload.entry].currentBytes = payload.currentBytes
        downloads.value[payload.entry].progress = payload.progress
      } else if(payload.state === "DOWNLOADING") {
        downloads.value[payload.entry] = {
          ...payload,
          url: getWorkshopUrl(payload.entry)
        }
      } else {
        if(payload.state === "DOWNLOADED") {
          if(!downloads.value[payload.entry]) return console.warn(`Progress update for download that we don't know: ${payload.entry}`)
          downloads.value[payload.entry].progress = 1
          downloads.value[payload.entry].currentBytes = downloads.value[payload.entry].totalBytes
        }

        downloadLog.value.push({
          state: payload.state || payload.code,
          message: payload.message,
          success: payload.state == "SUCCESS"
        })
      }
    } catch(err) {
      console.warn("Got invalid json payload: ", err, " data: ", event.data)
    }
  });
}

function getWorkshopUrl(id: string|number) {
  return `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`
}

function close() {
  emit('close', downloadState.value == DownloadState.Done)
}

onBeforeMount(() => {
  link.value = route.params.url ?? route.query.url
  if(route.query.dests) {
    const dests = route.query.dests.toString().split(",")
    installDestinations.value = dests
  }
})
</script>
