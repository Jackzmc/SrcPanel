<template>
<div>
  <DownloadAddonModal v-if="showDownloadModal" :share="shareInfo" @close="showDownloadModal = false"/>
  <div class="container" v-if="ready">
    <div class="level">
      <div class="level-left">
        <div class="level-item">
          <h5 class="title is-5">Viewing {{filteredVPKs.length}} addons - Click a name to view information</h5>
        </div>
      </div>
      <div class="level-right">
        <div class="level-item">
          <div class="field">
            <label class="label">Share</label>
            <div class="control">
              <div class="select">
                <select v-model="selectedShare">
                  <option v-for="share in shares" :key="share" :value="share">
                    {{share}}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div class="level-item">
          <div class="field">
            <label class="label">&nbsp;</label>
            <div class="control" v-if="shareInfo && shareInfo.downloadSources.length > 0">
              <a v-if="shareInfo.downloadSources.includes('steam_workshop')" class="button is-success is-fullwidth" @click="showDownloadModal = true">Add Workshop Addon</a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p>
      Click on an addon to view it's workshop information.
    </p>
    <p>
      X means map is not installed on server. Checkmark means it is.
      Click on the icon to toggle it between being disabled and enabled
    </p>
    <p>After downloading new maps or installing (toggling) a map, the server has to be restarted for it to load. <router-link to="/admin/servers/">Click here to view servers page</router-link></p>
    <br>
    <div class="columns">
      <div :class="['column', {'is-8': prefetch !== undefined}]">

        <table class="table is-striped is-fullwidth">
          <thead>
            <tr>
              <th><input type="text" class="input" placeholder="Search" v-model="search" /></th>
              <th></th>
              <th data-tooltip="Total file size of all addons">{{ formatSize(computedTotalFileSize, true, 0) }}</th>
              <th></th>
              <template v-if="shareInfo&&!prefetch">
                <th v-for="dest in shareInfo.destinations" :key="dest" />
              </template>
            </tr>
            <tr>
              <th><a @click="setSortFunc('filename', SORT_NAME)">
                File <span v-if="hasAnyWorkshop">/ Workshop </span>Name
                <span v-if="sort?.id === 'filename'">{{sortSymbol}}</span>
              </a></th>
              <th v-if="hasAnyWorkshop" style="width:0"><a @click="setSortFunc('isWorkshop', SORT_WORKSHOP)">
                Workshop
                <span v-if="sort?.id === 'isWorkshop'">{{sortSymbol}}</span>
              </a></th>
              <th><a @click="setSortFunc('filesize', SORT_FILE_SIZE)">
                File Size
                <span v-if="sort?.id === 'filesize'">{{sortSymbol}}</span>
              </a></th>
              <th><a @click="setSortFunc('lastUpdated', SORT_LAST_UPDATED)">
                Last Updated
                <span v-if="sort?.id === 'lastUpdated'">{{sortSymbol}}</span>
              </a></th>
              <template v-if="shareInfo&&!prefetch">
                <th v-for="dest in shareInfo.destinations" :key="dest" class="has-text-centered" style="width:0">
                  <a @click="setSort(dest, 'shareInfo')">{{ dest.name || dest.id }}
                    <span v-if="sort?.id === dest">{{sortSymbol}}</span>
                  </a>
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="vpk in filteredVPKs" :key="vpk.filename">
              <td>
                <a v-if="vpk.workshop" @click="preview(vpk)" :data-tooltip="'Filename: ' + vpk.filename">{{vpk.workshop.title}}</a>
                <span v-else>{{vpk.filename}}</span>
              </td>
              <td v-if="hasAnyWorkshop">
                <a v-if="vpk.workshop" :href="vpk.workshop.url" class="button is-small">Workshop</a>
              </td>
              <td>
                <span v-if="vpk.workshop">{{formatSize(vpk.workshop.filesize, true, 0)}}</span>
                <span v-else>{{formatSize(vpk.filesize, true, 0)}}</span>
              </td>
              <td>
                <span v-if="vpk.workshop">{{formatTime(vpk.workshop.lastUpdated)}}</span>
                <span v-else>{{formatTime(vpk.lastModified)}}</span>
              </td>
              <template v-if="shareInfo&&!prefetch">
                <td v-for="(dest, i) in shareInfo.destinations" :key="dest.id" :class="['has-text-centered', {'column-separator': i == 0 }]">
                  <em v-if="!vpk.installInfo" data-tooltip="Could not determine share install information">?</em>
                  <a @click="installAddon(vpk, dest.id, 'uninstall')" v-else-if="vpk.installInfo[dest.id]" data-tooltip="Installed. Click to uninstall">
                    ✔️
                  </a>
                  <a @click="installAddon(vpk, dest.id, 'install')" v-else data-tooltip="Not installed. Click to install">
                    ❌
                  </a>
                </td>
              </template>
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
    <p class="title is-2 has-text-centered">Fetching addons...</p>
    <p class="subtitle is-4 has-text-centered">This may take some time, please wait...</p>
  </div>
  <br>
</div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onMounted } from 'vue'
import DownloadAddonModal from '@/components/modals/DownloadAddonModal.vue'
import { useRoute, useRouter } from 'vue-router'

const SORT_NAME = (a: any, b: any) => {
  return (a.workshop?.title ?? a.filename).localeCompare(b.workshop?.title ?? b.filename)
}
const SORT_FILE_SIZE = (a: any, b: any) => {
  return (a.filesize ?? a.workshop.filesize) - (b.filesize ?? b.workshop.filesize)
}
const SORT_WORKSHOP = (a: any, b: any) => {
  if(a.workshop && !b.workshop) return 1
  else if(!a.workshop && b.workshop) return -1
  return 0
}
const SORT_LAST_UPDATED = (a: any, b: any) => {
  return (a.lastModified ?? a.workshop.lastUpdated) - (b.lastModified ?? b.workshop.lastUpdated)
}
const route = useRoute()
const router = useRouter()


let vpks = ref<any[]>([])
let ready = ref(false)
let search = ref<any>()
let prefetch = ref<any>()
let error = ref<string>()
let hasAnyWorkshop = ref(false)
let sort = ref<{
  id: string,
  func: Function,
  descending: boolean
} | undefined>()

let selectedShare = ref<string>("default")
watch(() => selectedShare.value, fetchVPKS)
let shares = ref<string[]>(["default"])
let shareInfo = ref()
let totalFileSize = ref(0)
const computedTotalFileSize = computed(() => {
  if(!search.value) return totalFileSize.value
  let size = 0
  for(const entry of filteredVPKs.value) {
    size += (entry.workshop ? entry.workshop.filesize : entry.filesize )
  }
  return size
})

let showDownloadModal = ref(false)
const sortSymbol = computed(() => {
  if(!sort.value) return ''
  else if(sort.value.descending) return '(↓)'
  else return '(↑)'
})
function setSort(id: string, column: string) {
  setSortFunc(id, (a: any, b: any) => {
    if(!a[column] || !b[column]) return 0
    return a[column][id] - b[column][id]
  })
}
function setSortFunc(id: string, sortFunc: Function) {
  if(sort.value && (!sort.value.descending || sort.value.id != id)) sort.value = undefined
  else if(sort.value) {
    sort.value.descending = false
  } else {
    sort.value = {
      func: sortFunc,
      id,
      descending: true
    }
  }
}
const filteredVPKs = computed(() => {
  const query = search.value?.toLowerCase()
  let _sort = (a: any, b: any) => { return 0 }
  if(sort.value) {
    _sort = (a: any, b: any) => {
      const { id, descending, func } = sort.value! as { column: string, id: string, descending: boolean, func: Function }
      if(descending) {
        return func(b, a)
      } else {
        return func(a, b)
      }
    }
  }


  return vpks.value
    .filter(vpk => {
      return (!query || (
        vpk.filename.toLowerCase().includes(query) ||
          (vpk.workshop && vpk.workshop.title.toLowerCase().includes(query)
        )
      ))
    })
    .sort(_sort)
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

function preview(entry: any) {
  router.push(`/admin/addons/${entry.filename}`)
  prefetch.value = entry.workshop
}
async function fetchShares() {
  error.value = undefined
  shares.value = []
  try {
    const response = await fetch(`/api/shares`)
    const json = await response.json()
    if(response.ok) {
      shares.value = json.shares
    } else {
      error.value = json.error ? `${json.error}: ${json.message}` : response.statusText
    }
  } catch(err: any) {
    error.value = err.message || err
  }
}
async function fetchVPKS() {
  error.value = undefined
  shareInfo.value = undefined
  vpks.value = []
  hasAnyWorkshop.value = false
  totalFileSize.value = 0
  try {
    const response = await fetch(`/api/shares/${selectedShare.value}/addons`)
    const json = await response.json()
    if(response.ok) {
      shareInfo.value = json.shareInfo
      vpks.value = json.addons.map((entry: any) => {
        if(entry.workshop) {
          hasAnyWorkshop.value = true
          if(entry.workshop.deleted) {
            entry.workshop = null
            return entry
          }
          entry.workshop.url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${entry.filename.slice(0, -4)}`
          totalFileSize.value += entry.workshop.filesize
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

async function installAddon(vpk: any, destKey: string, mode: "install" | "uninstall") {
  try {
    const response = await fetch(`/api/shares/${selectedShare.value}/addons/${vpk.filename}/${mode}/${destKey}`, { method: 'POST' })
    const json = await response.json()
    if(response.ok) {
      // Update local copy
      for(const vpk2 of vpks.value) {
        if(vpk2.filename === vpk.filename) {
          vpk2.installInfo[destKey] = (mode == "install")
          return
        }
      }
      console.warn("installAddon called with addon that is not downloaded", { vpk, destKey, mode })
    } else {
      alert(json.error ? `${json.error}: ${json.message}` : response.statusText)
    }
  } catch(err: any) {
    alert(err.message || err)
  }
}

onBeforeMount(async() => {
  await fetchShares()
  if(route.query.share) {
    const share = route.query.share.toString()
    if(shares.value.includes(share)) {
      selectedShare.value = share.toString()
    } else {
      error.value = `No shares with the id "${share}" were found`
      return
    }
  }
  await fetchVPKS()
  if(route.params.id) {
    for(const vpk of vpks.value) {
      if(vpk.filename === route.params.id) {
        prefetch.value = vpk.workshop
        break
      }
    }
  }
  if(route.query.url && shareInfo.value.downloadSources.includes("steam_workshop")) {
    showDownloadModal.value = true
  }
})
</script>

<style>
.column-separator {
  border-left: solid 1px!important;
}
</style>
