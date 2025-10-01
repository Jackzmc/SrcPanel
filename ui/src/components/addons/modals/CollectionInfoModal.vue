<template>
  <Modal active closable @close="close">
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">{{ addonName }}
          <span class="tag is-info has-tooltip-bottom is-pulled-right mr-2 is-rounded" data-tooltip="The target share">{{props.share.id}}</span>
        </p>
        <button class="delete" aria-label="close" @click='close(false)'></button>
      </header>
      <section class="modal-card-body pt-1">
        <Tabs inner-wrapper-class="tabs" :options="{ useUrlFragment: false }">
          <Tab name="Overview">
            <template v-if="props.addon.children.length > 0">
              <figure class="image" style="max-width:256px;max-height:256px">
                <img alt="The workshop addon's uploaded image preview" :src="props.addon.children[0].workshop.previewUrl"
                  @load="previewImageLoaded = true" />
                <img v-if="!previewImageLoaded" src="@/assets/loader.gif" />
              </figure>
              <br><br>
            </template>
            <table class="table is-striped is-fullwidth">
              <tbody>
                <tr>
                  <th>Collection ID</th>
                  <td>{{props.addon.collection.id}}</td>
                </tr>
                <tr>
                  <th>Workshop</th>
                  <td>
                    <a target="_blank" :href="'https://steamcommunity.com/workshop/filedetails/?id=' + props.addon.collection.id" class="is-small"
                      data-tooltip="Open the collections's steam workshop page">
                      <Icon icon="arrow-up-right-from-square" text-left="Open Workshop Page"></Icon>
                    </a>
                  </td>
                </tr>
                <tr>
                  <th>File Size</th>
                  <td>{{ totalFileSize }}</td>
                </tr>
                <tr v-if="props.addon.meta.chapterIds">
                  <th>Chapters</th>
                  <td>
                    <ul>
                      <li v-for="chapter in props.addon.meta.chapterIds" :key="chapter">{{ chapter }}</li>
                    </ul>
                  </td>
                </tr>
                <tr v-if="props.addon.meta.chapterIds">
                  <th>Rating</th>
                  <td v-if="mapRating.loadState == LoadState.Success">
                    <template v-if="mapRating.data?.avgRating">
                      <Icon size="is-small" icon="fas star" v-for=" i in Math.round( mapRating.data.avgRating ) " :key="i" />
                      <Icon size="is-small" icon="far star" v-for=" i in 5 - Math.round( mapRating.data.avgRating ) " :key="i + 10" />
                      {{ Number( mapRating.data.avgRating ).toFixed( 1 ) }}
                    </template>
                    <template v-else>
                      No rating
                    </template>
                  </td>
                  <td v-else-if="mapRating.loadState == LoadState.Error">
                    <Icon icon="fa-times" class="has-text-danger">Could not load rating</Icon>
                  </td>
                  <td v-else>Loading...</td>
                </tr>
              </tbody>
            </table>
            <h5 class="title is-5">Collection Addons</h5>
            <p class="subtitle is-6">Click any child addon to view their addon entry</p>
            <table class="table is-fullwidth">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>File Size</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="child in props.addon.children" :key="child.filename">
                  <td><router-link
                      :to="{ name: 'file-info', params: { shareId: props.share.id, addon: child.filename } }">
                      {{ child.workshop?.title ?? child.filename }}
                    </router-link>
                  </td>
                  <td>{{ formatSize(child.filesize) }}</td>
                </tr>
              </tbody>
            </table>
          </Tab>
          <Tab name="Servers">
            <p class="subtitle is-6">Click any tag to enable or disable it from the server.<br>The server must be restarted for the
              changes to apply.</p>
            <table class="table">
              <thead>
                <tr>
                  <th>Enabled</th>
                  <th style="width:100%">Server</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(installed, dest) in installInfo.collection" :key="dest">
                  <td>
                    <input :id="dest" type="checkbox" class="switch is-rtl" :checked="installed == true"
                      @click="enableAddons(dest, installed ? 'disable' : 'enable')" :disabled="installed == null">
                    <label :for="dest"></label>
                    <!----<label class="checkbox">
                                <input type="checkbox" :checked="installed == true" @click="enableAddon(dest, installed ? 'disable' : 'enable')" :disabled="installed == null" />
                                {{ installed ? 'Enabled' : 'Disabled' }}
                              </label> -->
                  </td>
                  <td>{{ dest }}</td>
                </tr>
              </tbody>
            </table>
          </Tab>
        </Tabs>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button class="button" @click="close(false)">
            Close
          </button>
          <a v-if="pendingRestarts.length > 0" class="button is-info" data-tooltip="Server must be restarted to apply changes" @click='restartServers'>Restart Servers</a>
          <a target="_blank" :href="workshopUrl" class="button is-info" data-tooltip="View the steam workshop page">Steam Workshop</a>
          <a class="button is-danger" data-tooltip="Uninstall from all servers and delete files" @click="deleteAddons">Delete Collection</a>
        </div>
      </footer>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import { useNotification } from "@kyvg/vue3-notification";
import { computed, ref, onBeforeMount } from 'vue';
import { LiveRecordCommandResponse } from '../../../../../common-types/Live';
// @ts-expect-error no types
import { Tab, Tabs } from "vue3-tabs-component";
import { LoadState } from '@/types/global.js';

const emit = defineEmits(['close'])
const { notify }  = useNotification()
const props = defineProps({
  addon: null,
  share: null
})
let previewImageLoaded = ref(false)
let pendingRestarts = ref<string[]>([])
let mapRating = ref<{data?:{
  avgRating: number,
  ratings: {user:{id:string,name:string},value: number}[]
}, loadState: LoadState}>({ loadState: LoadState.Idle })

const workshopUrl = computed(() => {
  return `https://steamcommunity.com/workshop/filedetails/?id=${props.addon.collection.id}`
})

let installInfo = ref<{ collection: Record<string, boolean>, children: Record<string, Record<string, boolean>> }>({ collection: {}, children: {} })
onBeforeMount(() => {
  if(!props.addon || props.addon.children.length == 0) return
  const children: Record<string, Record<string, boolean>> = {}
  for(const child of props.addon.children) {
    children[child.filename] = child.installInfo
  }
  installInfo.value = {
    collection: props.addon.children[0].installInfo as Record<string, boolean>,
    children
  }
  fetchRating()
})

async function fetchRating() {
  mapRating.value.data = undefined
  mapRating.value.loadState = LoadState.Loading
  if(!props.addon.meta.chapterIds) return
  const response = await fetch(`https://stats.jackz.me/api/maps/${props.addon.meta.chapterIds.at(-1)}`)
  if(response.ok) {
    mapRating.value.data = await response.json()
    mapRating.value.loadState = LoadState.Success
  } else if(response.status == 404) {
    mapRating.value.loadState = LoadState.Success
  } else {
    mapRating.value.loadState = LoadState.Error
  }
}


const totalFileSize = computed(() => {
  if(!props.addon) return
  let size = 0
  for(const child of props.addon.children) {
    size += child.filesize
  }
  return formatSize(size)
})

async function enableAddons(destKey: string, mode: "enable" | "disable") {
  for(const child of props.addon.children) {
    await enableAddon(destKey, mode, child.filename)
  }
}

async function enableAddon(destKey: string, mode: "enable" | "disable", filename: string) {
  try {
    const response = await fetch(`/api/shares/${props.share.id}/addons/${filename}/${mode}/${destKey}`, { method: 'POST' })
    const json = await response.json()
    if(response.ok) {
      // Update local copy
      installInfo.value.children[filename][destKey] = (mode == "enable")
      if(!pendingRestarts.value.includes(destKey))
        pendingRestarts.value.push(destKey)
      notify({
        type: "success",
        text: mode == "enable" ? `Enabled ${filename} on ${destKey}` : `Disabled ${filename} on ${destKey}`
      })
    } else {
      notify({
        type: "error",
        text: json.error ? `${json.error}: ${json.message}` : response.statusText
      })
      alert(json.error ? `${json.error}: ${json.message}` : response.statusText)
    }
  } catch(err: any) {
    notify({
        type: "error",
        text: err.message
    })
  }
}

async function restartServers() {
  let count = {
    total: 0,
    success: 0,
    rejected: 0
  }
  for(const destId of pendingRestarts.value) {
    const destInfo = props.share.destinations[destId]
    if(destInfo.serverIds) {
      const promises = destInfo.serverIds.map((serverId: string) => restartServer(serverId))
      const results = await Promise.allSettled(promises)
      const rejectedCount = results.reduce((pv, result) => {
        if(result.status === "rejected") ++pv
        return pv
      }, 0)
      if(rejectedCount > 0) {
        console.error(`${destInfo.id}: ${rejectedCount} / ${promises.length} servers failed to restart`)
      }
      count.total += promises.length
      count.success += promises.length - rejectedCount
      count.rejected += rejectedCount
    }
  }

  let msg = `${count.success} / ${count.total} servers restarted`
  if(count.rejected > 0) msg += "<br>See the console for more information"

  notify({
    type: count.rejected > 0 ? "error" : "success",
    title: "Server Restarted",
    text: msg,
  })
  emit('close')
}

async function restartServer(id: string) {
  const response = await fetch(`/api/servers/${id}/action/builtin:request_stop`, {
    method: 'POST'
  })
  if(response.ok) {
    const json: LiveRecordCommandResponse = await response.json()
    return json.result
  }
  throw new Error(`Server returned ${response.status} ${response.statusText} for ${id}`)
}

const addonName = computed(() => {
  if(!props.addon) return "[error]"
  return props.addon.collection.name ?? props.addon.collection.id
})

async function deleteAddon(id: string) {
  try {
    const response = await fetch(`/api/shares/${props.share.id}/addons/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if(response.ok) {
      notify({
        type: 'success',
        text: `Deleted ${addonName.value}`
      })
      close(true)
    } else {
      const json = await response.json()
      notify({
        type: 'error',
        text: json.message
      })
    }

  } catch(err: any) {
    console.error("Faield to delete addon: " + err)
    notify({
      type: 'error',
      text: err.message
    })
  }
}
async function deleteAddons() {
  if(window.confirm("Are you sure you want to delete this collection? All children of this collection will be be uninstalled from all servers and their files deleted.")) {
    for(const child of props.addon.children) {
      deleteAddon(child.filename)
    }
  }
}

function close(requestRefresh = false) {
  emit('close', requestRefresh)
}

function formatSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return (dp > 0 ? bytes.toFixed(dp) : Math.round(bytes)) + ' ' + units[u];
}

function formatTime(time: number) {
  const date = new Date(time*1000)
  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`
}
</script>
