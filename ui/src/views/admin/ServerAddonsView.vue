<template>
<div>
  <div class="container" v-if="ready">
    <div class="columns">
      <div :class="['column', {'is-8': prefetch !== undefined}]">
        <b>Listing {{vpks.length}} workshop items - Click a name to view information</b>
        <table class="table is-striped is-fullwidth">
          <thead>
            <tr>
              <th></th>
              <th><input type="text" class="input" placeholder="Search" v-model="search" /></th>
            </tr>
            <tr>
              <th >File Name or Workshop Name</th>
              <th style="width:0">Workshop</th>
              <th>File Size</th>
              <th>Last Updated</th>
              <th v-for="dest in shareServers" :key="dest" class="has-text-centered" style="width:0">
                {{ dest }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="vpk in filteredVPKs" :key="vpk.filename">
              <td>
                <a v-if="vpk.workshop" @click="preview(vpk)" :data-tooltip="'Filename: '+ vpk.filename">{{vpk.workshop.title}}</a>
                <span v-else>{{vpk.filename}}.vpk</span>
              </td>
              <td>
                <a v-if="vpk.workshop" :href="vpk.workshop.url" class="button is-small">Workshop</a>
              </td>
              <td>
                <span v-if="vpk.workshop">{{formatSize(vpk.workshop.filesize, true, 0)}}</span>
              </td>
              <td>
                <span v-if="vpk.workshop">{{formatTime(vpk.workshop.lastUpdated)}}</span>
              </td>
              <td v-for="(dest, i) in shareServers" :key="dest" :class="['has-text-centered', {'column-separator': i == 0 }]">
                <em v-if="!vpk.shareInfo">(n/a)</em>
                <a @click="uninstallAddon(vpk, dest)" v-else-if="vpk.shareInfo[dest]" data-tooltip="Installed. Click to uninstall">
                  ✔️
                </a>
                <a @click="installAddon(vpk, dest)" v-else data-tooltip="Not installed. Click to install">
                  ❌
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="column" v-if="prefetch">
        <a class="button" @click="closePreview">⟵</a>
        <br><br>
        <img :src="prefetch.previewUrl" />
        <h4 class='title is-4'>{{prefetch.title}}</h4>
        <p class="subtitle is-6">{{formatSize(prefetch.filesize)}} • Updated {{ formatTime(prefetch.lastUpdated) }}</p>
        <div class="buttons">
          <a target="_blank" :href="prefetch.fileUrl"  data-tooltip="Direct download" class="button">Download</a>
          <a target="_blank" :href="prefetch.url" class="button is-info">View on steam workshop</a>
        </div>
        <p style="white-space: pre-wrap" class="content is-small" v-html="parsedDescription" />
      </div>
    </div>
  </div>
  <div v-else-if="error">
    <p class="title is-4 has-text-centered has-text-danger">Failed to load addons list</p>
    <p class="subtitle is-6 has-text-centered has-text-danger">{{error}}</p>
  </div>
  <div v-else>
    <p class="title is-4 has-text-centered">Fetching addons...</p>
    <p class="subtitle is-6 has-text-centered">This could take a bit</p>
  </div>
  <br>
</div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const emit = defineEmits([])
const route = useRoute()
const router = useRouter()

let vpks = ref<any[]>([])
let ready = ref(false)
let itemid = ref<any>()
let search = ref<any>()
let prefetch = ref<any>()
let error = ref<string>()

let share = ref<string>("default")

let shareServers = ref([])

const isDownloadable = computed(() => {
  return itemid.value && prefetch.value.result && prefetch.value.lastValid === itemid.value && !prefetch.value.error
})
const filteredVPKs = computed(() => {
  if (!search.value) {
    return vpks.value
  }
  const query = search.value.toLowerCase()
  return vpks.value.filter(vpk => {
    return vpk.filename.toLowerCase().includes(query) || (vpk.workshop && vpk.workshop.title.toLowerCase().includes(query))
  })
})
const parsedDescription = computed(() => {
  if(!prefetch.value) return
  return prefetch.value.description
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

function submitKey() {
  fetchVPKS()
}

function preview(entry: any) {
  router.push(`/admin/addons/${entry.filename}`)
  prefetch.value = entry.workshop
}
async function fetchVPKS() {
  error.value = undefined
  shareServers.value = []
  try {
    const response = await fetch(`/api/shares/default/addons`)
    const json = await response.json()
    if(response.ok) {
      shareServers.value = json.shareDestinations
      vpks.value = json.addons.map((entry: any) => {
        if(entry.workshop) {
          if(entry.workshop.deleted) entry.workshop = null
          else entry.workshop.url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${entry.filename}`
        }
        return entry
      })
      ready.value = true
    } else {
      error.value = json.error ? `${json.error}: ${json.message}` : response.statusText
    }
  } catch(err: any) {
    error.value = err.message || err
  }
}

function closePreview() {
  prefetch.value = undefined
  router.push('/admin/addons')
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

async function installAddon(vpk: any, destKey: string) {
  try {
    const response = await fetch(`/api/shares/default/addons/${vpk.filename}.vpk/install/${destKey}`, { method: 'POST' })
    const json = await response.json()
    if(response.ok) {
      // alert("Addon is now installed")
      for(const vpk2 of vpks.value) {
        if(vpk2.filename === vpk.filename) {
          vpk2.shareInfo[destKey] = true
          return
        }
      }
      console.warn("installAddon called with addon that is not downloaded")
    } else {
      alert(json.error ? `${json.error}: ${json.message}` : response.statusText)
    }
  } catch(err: any) {
    alert(err.message || err)
  }
}

async function uninstallAddon(vpk: any, destKey: string) {
  try {
    const response = await fetch(`/api/shares/default/addons/${vpk.filename}.vpk/uninstall/${destKey}`, { method: 'POST' })
    const json = await response.json()
    if(response.ok) {
      // alert("Addon is now removed")
      for(const vpk2 of vpks.value) {
        if(vpk2.filename === vpk.filename) {
          vpk2.shareInfo[destKey] = false
          return
        }
      }
      console.warn("unInstallAddon called with addon that is not downloaded")
    } else {
      alert(json.error ? `${json.error}: ${json.message}` : response.statusText)
    }
  } catch(err: any) {
    alert(err.message || err)
  }
}

onBeforeMount(async() => {
  await fetchVPKS()
  if(route.params.id) {
    for(const vpk of vpks.value) {
      if(vpk.filename === route.params.id) {
        prefetch.value = vpk.workshop
        break
      }
    }
  }
})
</script>

<style>
.column-separator {
  border-left: solid 1px!important;
}
</style>
