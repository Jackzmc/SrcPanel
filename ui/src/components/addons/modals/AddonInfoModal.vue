<template>
  <Modal active closable @close="close">
    <div class="modal-card">
      <header class="modal-card-head" v-if="share && addon">
        <p class="modal-card-title">Addon Info
          <span class="tag is-info has-tooltip-bottom is-pulled-right mr-2 is-rounded" data-tooltip="The target share">{{share.id}}</span>
        </p>
        <button class="delete" aria-label="close" @click='close(false)'></button>
      </header>
      <header class="modal-card-head" v-else>
        <p class="modal-card-title">
          <Icon icon="spinner" spin>Loading...</Icon>
        </p>
        <button class="delete" aria-label="close" @click='close(false)'></button>
      </header>
      <section class="modal-card-body" v-if="addon">
        <template v-if="addon.workshop">
          <img alt="The workshop addon's uploaded image preview" :src="addon.workshop.previewUrl" @load="previewImageLoaded = true" />
          <img v-if="!previewImageLoaded" src="@/assets/WorkshopImageFallback.svg" />
          <br><br>
        </template>
        <h4 class='title is-4'>{{ addonName }} </h4>
        <div class="field is-grouped is-grouped-multiline">
          <div class="control">
            <div class="tags has-addons">
              <span class="tag is-dark">Filename</span>
              <span class="tag is-info">{{props.addon.filename}}</span>
            </div>
          </div>
          <div class="control">
            <div class="tags has-addons">
              <span class="tag is-dark">File Size</span>
              <span class="tag is-info">{{formatSize(props.addon.workshop?.filesize ?? props.addon.filesize)}}</span>
            </div>
          </div>
          <div class="control">
            <div class="tags has-addons">
              <span v-if="props.addon.workshop?.deleted" class="tag is-danger has-tooltip-warning has-tooltip-bottom" data-tooltip="Addon no longer exists on the workshop, but it's still locally stored">Deleted</span>
            </div>
          </div>
        </div>
        <div class="field is-grouped is-grouped-multiline">
          <div class="control">
            <div class="tags has-addons">
              <span class="tag is-dark">Last Updated</span>
              <span class="tag">{{ formatTime(props.addon.workshop?.lastUpdated ?? props.addon.lastModified) }}</span>
            </div>
          </div>
          <div class="control">
            <div class="tags has-addons">
              <span class="tag is-dark">Downloaded</span>
              <span class="tag">{{ formatTime(props.addon.downloaded) }}</span>
            </div>
          </div>
        </div>
        <h5 class="title is-5">Servers</h5>
        <p class="subtitle is-6">Click any tag to enable or disable it from the server. The server must be restarted for the changes to apply.</p>
        <div class="field is-grouped is-grouped-multiline">
          <div class="control" v-for="(installed, dest) in installInfo" :key="dest">
            <div class="tags has-addons">
              <span class="tag is-dark">{{ dest }}</span>
              <a class="tag is-success" v-if="installed" @click="installAddon(dest, 'uninstall')" data-tooltip="Click here to disable">Enabled</a>
              <a class="tag is-danger" v-else @click="installAddon(dest, 'install')" data-tooltip="Click here to enable">Disabled</a>
            </div>
          </div>
        </div>
        <template v-if="props.addon.workshop">
          <h5 class="title is-5">Description</h5>
          <div class="buttons">
            <a target="_blank" :href="props.addon.workshop.fileUrl"  data-tooltip="Download the addon directly from steam workshop" class="button is-small is-info">Download (Workshop)</a>
            <a target="_blank" :href="downloadUrl"  data-tooltip="Download the addon from the admin panel" class="button is-small">Download (Direct)</a>
          </div>
          <article class="message">
            <div class="message-body content is-size-7">
              <span style="white-space: pre-wrap" v-html="parsedDescription" />
            </div>
          </article>
        </template>
        <div class="buttons" v-else>
          <a target="_blank" :href="downloadUrl"  data-tooltip="Download the addon from the admin panel" class="button is-small is-link">Download (Direct)</a>
          </div>
      </section>
      <footer class="modal-card-foot">
        <button class="button" @click="close(false)">
          Close
        </button>
        <a v-if="pendingRestarts.length > 0" class="button is-info" data-tooltip="Server must be restarted to apply changes" @click='restartServers'>Restart Servers</a>
        <a v-if="addon && addon.workshop" target="_blank" :href="addon.workshop.url" class="button is-info" data-tooltip="View the steam workshop page">Steam Workshop</a>
        <a class="button is-danger" data-tooltip="Uninstall from all servers and delete the file" @click="deleteAddon">Delete</a>
      </footer>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import { useNotification } from "@kyvg/vue3-notification";
import { computed, ref, onBeforeMount } from 'vue';

const emit = defineEmits(['close'])
const { notify }  = useNotification()
const props = defineProps<{
  addon: any,
  share: any
}>()
let previewImageLoaded = ref(false)
let pendingRestarts = ref<string[]>([])
let installInfo = ref<Record<string, boolean>>()

onBeforeMount(() => {
  if(props.addon)
    installInfo.value = props.addon.installInfo
})

async function installAddon(destKey: string, mode: "install" | "uninstall") {
  if(!installInfo.value) return console.warn('no install info')
  try {
    const response = await fetch(`/api/shares/${props.share.id}/addons/${props.addon.filename}/${mode}/${destKey}`, { method: 'POST' })
    const json = await response.json()
    if(response.ok) {
      // Update local copy
      installInfo.value[destKey] = (mode == "install")
      if(!pendingRestarts.value.includes(destKey))
        pendingRestarts.value.push(destKey)
      notify({
        type: "success",
        text: mode == "install" ? `Enabled ${addonName.value} on ${destKey}` : `Disabled ${addonName.value} on ${destKey}`
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
  close()
}

async function restartServer(id: string) {
  const response = await fetch(`/api/servers/${id}/restart`, {
    method: 'POST'
  })
  if(response.ok) return true
  throw new Error(`Server returned ${response.status} ${response.statusText} for ${id}`)
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
  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString(undefined, { timeStyle: "short" })}`
}
</script>
