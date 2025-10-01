<template>
  <Modal active closable @close="close">
    <div class="modal-card">
      <header class="modal-card-head" v-if="share && addon">
        <p class="modal-card-title">{{ addonName }}
          <span class="tag is-info has-tooltip-bottom is-pulled-right mr-2 is-rounded" data-tooltip="The target share">{{share.id}}</span>
        </p>
        <button class="delete" aria-label="close" @click='close()'></button>
      </header>
      <header class="modal-card-head" v-else>
        <p class="modal-card-title">
          <Icon icon="spinner" spin>Loading...</Icon>
        </p>
        <button class="delete" aria-label="close" @click='close()'></button>
      </header>
      <section class="modal-card-body pt-1" v-if="addon">
        <Tabs inner-wrapper-class="tabs" :options="{ useUrlFragment: false }">
        <Tab name="Overview">
          <div class="buttons">
            <a v-if="props.addon.workshop" target="_blank" :href="props.addon.workshop.fileUrl"
              data-tooltip="Download the addon directly from steam workshop"
              class="button is-small is-info has-tooltip-right">Download (Workshop)</a>
            <a target="_blank" :href="downloadUrl" data-tooltip="Download the addon from the admin panel"
              class="button is-small has-tooltip-right">Download (Direct)</a>
          </div>
          <template v-if="addon.workshop">
            <figure class="image" style="max-width:256px;max-height:256px">
              <img alt="The workshop addon's uploaded image preview" :src="addon.workshop.previewUrl"
              @load="previewImageLoaded = true" />
            <img v-if="!previewImageLoaded" src="@/assets/WorkshopImageFallback.svg" />
            </figure>
            <br><br>
          </template>
          <table class="table is-striped is-fullwidth">
            <tbody>
              <tr>
                <th>Filename</th>
                <td>{{props.addon.filename}}</td>
              </tr>
              <tr v-if="props.addon.workshop">
                <th>Workshop</th>
                <td v-if="props.addon.workshop?.deleted">
                  <span class="tag is-danger has-tooltip-warning has-tooltip-bottom"
                    data-tooltip="Addon no longer exists on the workshop, but it's still locally stored">Deleted</span>
                </td>
                <td v-else>
                  <a target="_blank" :href="addon.workshop.url" class="is-small"
                    data-tooltip="Open the addon's steam workshop page">
                    <Icon icon="arrow-up-right-from-square" text-left="Open Workshop Page"></Icon>
                  </a>
                </td>
              </tr>
              <tr>
                <th>File Size</th>
                <td>{{ formatSize(props.addon.workshop?.filesize ?? props.addon.filesize) }}</td>
              </tr>
              <tr>
                <th>Last Updated</th>
                <td>{{ formatDate(props.addon.workshop?.lastUpdated ?? props.addon.lastModified) }}</td>
              </tr>
              <tr>
                <th>Downloaded</th>
                <td>{{ formatDate(props.addon.downloaded) }}</td>
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
                <th>Rating <Icon icon-class="has-text-info has-tooltip-right" icon="fa-circle-info" data-tooltip="Ratings pulled from stats.jackz.me"></Icon></th>
                <td v-if="mapRating.loadState == LoadState.Success">
                  <template v-if="mapRating.data?.avgRating">
                    <Icon size="is-small" icon="fas star" v-for=" i in Math.round( mapRating.data.avgRating ) " :key="i" />
                    <Icon size="is-small" icon="far star" v-for=" i in 5 - Math.round( mapRating.data.avgRating )  " :key="i + 10" />
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
          <article class="message" v-if="parsedDescription">
            <div class="message-body content is-size-7">
              <h4>Description</h4>
              <span style="white-space: pre-wrap" v-html="parsedDescription" />
            </div>
          </article>
        </Tab>
        <Tab name="Servers">
          <p class="subtitle is-6">Click any tag to enable or disable it from the server.<br>The server must be restarted for the changes to apply.</p>
          <table class="table">
            <thead>
              <tr>
                <th>Enabled</th>
                <th style="width:100%">Server</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(installed, dest) in installInfo" :key="dest">
                <td>
                  <input :id="dest" type="checkbox" class="switch is-rtl" :checked="installed == true"
                    @click="enableAddon(dest, installed ? 'disable' : 'enable')" :disabled="installed == null">
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
      <footer class="modal-card-foot buttons is-justify-content-space-between">
        <button class="button" @click="close()">
          Close
        </button>
        <a v-if="pendingRestarts.length > 0" class="button is-info" data-tooltip="Server must be restarted to apply changes" @click='restartServers'>Restart Servers</a>
        <a class="button is-danger is-right" data-tooltip="Uninstall from all servers and delete the file"
        @click="deleteAddon"><Icon icon="trash" class="has-text-white">Delete</Icon></a>
      </footer>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import { useNotification } from "@kyvg/vue3-notification";
import { computed, ref, onBeforeMount, onActivated } from 'vue';
import { formatDate, formatSize, request, restartServer } from '@/js/util.js'
// @ts-expect-error no types
import { Tab, Tabs } from "vue3-tabs-component";
import { LoadState } from '@/types/global.js';

const emit = defineEmits(['close', 'update'])
const { notify }  = useNotification()
const props = defineProps<{
  addon: any,
  share: any
}>()
let previewImageLoaded = ref(false)
let pendingRestarts = ref<string[]>([])
let installInfo = ref<Record<string, boolean|null>>()
let hasUpdated = false
let mapRating = ref<{data?:{
  avgRating: number,
  ratings: {user:{id:string,name:string},value: number}[]
}, loadState: LoadState}>({ loadState: LoadState.Idle })

onBeforeMount(() => {
  if(props.addon) {
    installInfo.value = Object.assign({}, props.addon.installInfo)
    if(props.addon.meta.chapterIds) {
      fetchRating()
    }
  }
})

async function enableAddon(destKey: string, mode: "enable" | "disable") {
  if(!installInfo.value) return console.warn('no install info')
  installInfo.value[destKey] = null
  const response = await request(`/api/shares/${props.share.id}/addons/${props.addon.filename}/${mode}/${destKey}`, { method: 'POST' })
  if(response?.ok) {
    const json = await response.json()
    // Update local copy
    installInfo.value[destKey] = (mode == "enable")
    if(!pendingRestarts.value.includes(destKey))
      pendingRestarts.value.push(destKey)
    notify({
      type: "success",
      text: mode == "enable" ? `Enabled ${addonName.value} on ${destKey}` : `Disabled ${addonName.value} on ${destKey}`
    })
    emit('update', {
      installInfo: installInfo.value
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
  close()
}

const addonName = computed(() => {
  return props.addon.workshop ? props.addon.workshop.title : props.addon.filename
})

const downloadUrl = computed(() => {
  return `/api/shares/${props.share.id}/addons/${props.addon.filename}/download`
})

const parsedDescription = computed(() => {
  return props.addon.workshop?.description
    .replace(/\[b\]/gi, '<b>')
    .replace(/\[u\]/gi, '<u>')
    .replace(/\[i\]/gi, '<i>')
    .replace(/\[hr\]/gi, '<hr>')
    .replace(/\[img\](.*)\[\/img\]/gi, '<img src="$1" />')
    .replace(/\[h(\d)\]/gi, '<h$1>')
    .replace(/\[url=(.*)\]/gi, '<a href="$1">')
    .replace(/\[list]/gi, '<ul>')
    .replace(/\[\/list]/gi, '</ul>')
    .replace(/\[\*\](.*)/gi, '<li>$1</li>')
    .replace(/\[\/([a-zA-Z0-9]+)\]/gi, '</$1>')
})

async function deleteAddon() {
  if(window.confirm("Are you sure you want to delete this addon? This will be be uninstalled from all servers and its file will be deleted.")) {
    try {
      const response = await fetch(`/api/shares/${props.share.id}/addons/${props.addon.filename}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if(response.ok) {
        notify({
          type: 'success',
          text: `Deleted ${addonName.value}`
        })
        emit('update', { deleted: true })
        close()
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
}

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

onActivated(() => {
  if(props.addon.meta.chapterIds)
    fetchRating()
})

function close() {
  emit('close')
}

</script>
