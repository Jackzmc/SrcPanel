<template>
<div>
  <DownloadAddonModal v-if="showDownloadModal" :share="shareInfo" @close="onDownloadModalClosed"/>
  <AddonInfoModal v-if="showAddonModal" :share="shareInfo" :addon="prefetch" @close="closePreview" />
  <div class="container" v-if="ready">
    <div class="level">
      <div class="level-left">
        <div class="level-item">
          <h5 class="title is-4">Viewing {{filteredVPKs.length}} addons</h5>
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
    <p class="subtitle is-4" style="width:60%">Click on any addon to view additional info and to (un)install it from servers. <router-link to="/admin/servers/">Click here to view servers page</router-link></p>
    <br>
    <div class="columns">
      <div class="column">

        <table class="table is-striped is-fullwidth">
          <thead>
            <tr>
              <th><input type="text" class="input" placeholder="Search" v-model="search" /></th>
              <th></th>
              <th data-tooltip="Total file size of all addons">{{ formatSize(computedTotalFileSize, true, 0) }}</th>
              <th></th>
              <th></th>
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
              <th><a @click="setSortFunc('downloaded', SORT_DOWNLOADED)">
                Downloaded
                <span v-if="sort?.id === 'downloaded'">{{sortSymbol}}</span>
              </a></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="vpk in filteredVPKs" :key="vpk.filename ?? vpk.collection.id">
              <tr>
                <td>
                  <b v-if="vpk.collection"  @click="preview(vpk)">{{vpk.collection.name}} <span class="tag is-info">Collection</span></b>
                  <a :class="{'has-text-weight-light': vpk.enabledOn.length == 0, 'has-text-info': true }" v-else-if="vpk.workshop" @click="preview(vpk)" :data-tooltip="getTooltip(vpk)">
                    <b>{{vpk.workshop.title}}</b>
                  </a>
                  <a :class="{'has-text-weight-light': vpk.enabledOn.length == 0 }" @click="preview(vpk)" v-else :data-tooltip="getTooltip(vpk)">{{vpk.filename}}</a>
                  &nbsp;<span class="tag" v-if="!vpk.collection" data-tooltip="Number of servers the addon is installed on">{{ vpk.enabledOn.length }} servers</span>
                </td>
                <td v-if="hasAnyWorkshop">
                  <template v-if="vpk.workshop">
                    <span class="has-text-danger" v-if="vpk.workshop.delete" data-tooltip="Item has been deleted or private">Deleted</span>
                    <a v-else :href="vpk.workshop.url" class="button is-small" target="_blank">Workshop</a>
                  </template>
                  <a v-else-if="vpk.collection" :href="'https://steamcommunity.com/workshop/filedetails/?id=' + vpk.collection.id" class="button is-small" target="_blank">Workshop</a>
                </td>
                <td :colspan="vpk.collection ? 3 : 1">
                  <span v-if="vpk.workshop">{{formatSize(vpk.workshop.filesize, true, 0)}}</span>
                  <span v-else>{{formatSize(vpk.filesize, true, 0)}}</span>
                </td>
                <template v-if="!vpk.collection">
                <td>
                  <span v-if="vpk.workshop">{{formatTime(vpk.workshop.lastUpdated)}}</span>
                  <span v-else>{{formatTime(vpk.lastModified)}}</span>
                </td>
                <td>
                  <span>{{formatTime(vpk.downloaded)}}</span>
                </td>
                </template>
              </tr>
              <template v-if="vpk.collection">
                <tr v-for="child in vpk.children" :key="child.filename">
                  <td>
                    <a v-if="child.workshop" class="has-text-info ml-5" @click="preview(child)" :data-tooltip="getTooltip(child)">
                      <b>{{child.workshop.title}}</b>
                    </a>
                    <a @click="preview(child)" v-else class="ml-5" :data-tooltip="getTooltip(child)">{{child.filename}}</a>
                    &nbsp;<span class="tag" data-tooltip="Number of servers the addon is installed on">{{ child.enabledOn.length }} servers</span>
                  </td>
                  <td v-if="hasAnyWorkshop">
                    <a v-if="child.workshop" :href="child.workshop.url" class="button is-small" target="_blank">Workshop</a>
                  </td>
                  <td>
                    <span v-if="child.workshop">{{formatSize(child.workshop.filesize, true, 0)}}</span>
                    <span v-else>{{formatSize(child.filesize, true, 0)}}</span>
                  </td>
                  <td>
                    <span v-if="child.workshop">{{formatTime(child.workshop.lastUpdated)}}</span>
                    <span v-else>{{formatTime(child.lastModified)}}</span>
                  </td>
                  <td>
                    <span>{{formatTime(child.downloaded)}}</span>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
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
import AddonInfoModal from '@/components/modals/AddonInfoModal.vue'
import { useRoute, useRouter } from 'vue-router'
import { WorkshopItem } from '../../../../server/src/modules/steam';
import { AddonInfo } from '../../../../server/src/modules/Share';

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
  return (a.workshop?.lastUpdated ?? a.lastModified) - (b.workshop?.lastUpdated ?? b.lastModified)
}
const SORT_DOWNLOADED = (a: any, b: any) => {
  return (a.downloaded) - (b.downloaded)
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
let showAddonModal = ref(false)
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
      // Use the collection's first child for sorting
      if(a.collection && a.children.length > 0) a = a.children[0]
      if(b.collection && b.children.length > 0) b = b.children[0]

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
      if(!query) return true
      // Search the collection's name and it's children instead:
      if(vpk.collection) {
        return vpk.collection.name.toLowerCase().includes(query)
        || vpk.children.some((child: any) => child.filename.toLowerCase().includes(query) || (child.workshop && child.workshop.title.toLowerCase().includes(query)))
      }
      return (vpk.filename.toLowerCase().includes(query)
        || (vpk.workshop && vpk.workshop.title.toLowerCase().includes(query))
      )
    })
    .sort(_sort)
})

function preview(entry: any) {
  router.push(`/admin/addons/${selectedShare.value}/${entry.filename}`)
  prefetch.value = entry
  showAddonModal.value = true
}
function closePreview(removeEntry: boolean) {
  if(removeEntry) {
    const index = vpks.value.findIndex(vpk => vpk.filename === prefetch.value.filename)
    vpks.value.splice(index, 1)
  }
  router.push(`/admin/addons/${selectedShare.value}`)
  prefetch.value = null
  showAddonModal.value = false
}

function getTooltip(addon: any) {
  // const installedOn = Object.entries(addon.installInfo).filter(([key, value]) => value).map(([key]) => key).join("\n\t")
  if(!addon.enabledOn) {
    console.warn('missing enabledOn', { ... addon })
  }
  if(addon.enabledOn?.length > 0) {
    return `Filename: ${addon.filename}\nEnabled on:\n\t${addon.enabledOn.join("\n\t")}`
  } else {
    return `Filename: ${addon.filename}\nNot enabled on any servers`
  }
}

async function onDownloadModalClosed(requestRefresh: boolean) {
  showDownloadModal.value = false
  await fetchVPKS()
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
        if(entry.collection) {
          for(let child of entry.children) {
            child.enabledOn = child.installInfo ? Object.entries(child.installInfo).filter(([key, value]) => value).map(([key]) => key) : []
          }
        } else {
          entry.enabledOn = Object.entries(entry.installInfo).filter(([key, value]) => value).map(([key]) => key)
        }

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
  if(route.params.addon) {
    for(const vpk of vpks.value) {
      if(vpk.filename === route.params.addon) {
        prefetch.value = vpk
        showAddonModal.value = true
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
