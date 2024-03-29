<template>
  <Modal active closable @close="close">
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Collection Info
          <span class="tag is-info has-tooltip-bottom is-pulled-right mr-2 is-rounded" data-tooltip="The target share">{{props.share.id}}</span>
        </p>
        <button class="delete" aria-label="close" @click='close(false)'></button>
      </header>
      <section class="modal-card-body">
        <!-- <template v-if="props.addon.workshop">
          <img alt="The workshop addon's uploaded image preview" :src="props.addon.workshop.previewUrl" @load="previewImageLoaded = true" />
          <img v-if="!previewImageLoaded" src="@/assets/loader.gif" />
          <br><br>
        </template> -->
        <h4 class='title is-4'>{{ addonName }} </h4>
        <div class="field is-grouped is-grouped-multiline">
          <div class="control">
            <div class="tags has-addons">
              <span class="tag is-dark">Collection ID</span>
              <span class="tag is-info">{{props.addon.collection.id}}</span>
            </div>
          </div>
          <div class="control">
            <div class="tags has-addons">
              <span class="tag is-dark">File Size</span>
              <span class="tag is-info">{{totalFileSize}}</span>
            </div>
          </div>
          <div class="control">
            <div class="tags has-addons">
              <span class="tag is-dark">Collection Addons</span>
              <span class="tag is-info">{{props.addon.children.length}}</span>
            </div>
          </div>
        </div>
        <h5 class="title is-5">Servers</h5>
        <p class="subtitle is-6">Click any tag to enable or disable the collection from the server. The server must be restarted for the changes to apply.</p>
        <div class="field is-grouped is-grouped-multiline">
          <div class="field mr-2" v-for="(installed, dest) in installInfo.collection" :key="dest">
            <input :id="dest" type="checkbox" class="switch is-rtl" :checked="installed" @click="enableAddons(dest, installed ? 'disable' : 'enable')" :disabled="installed == null">
            <label :for="dest">{{ dest }}</label>
          </div>
        </div>
        <br>
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
              <td><router-link :to="{ name: 'file-info', params: { shareId: props.share.id, addon: child.filename } }">{{ child.filename }}</router-link></td>
              <td>{{ formatSize(child.filesize) }}</td>
            </tr>
          </tbody>
        </table>
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

const emit = defineEmits(['close'])
const { notify }  = useNotification()
const props = defineProps({
  addon: null,
  share: null
})
let previewImageLoaded = ref(false)
let pendingRestarts = ref<string[]>([])

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
})


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
  const response = await fetch(`/api/servers/${id}/restart`, {
    method: 'POST'
  })
  if(response.ok) return true
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
        text: `Deleted ${addonName}`
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
