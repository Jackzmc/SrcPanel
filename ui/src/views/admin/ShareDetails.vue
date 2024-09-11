<template>
<div>
  <router-view :share="shareInfo" :addon="prefetch" @update="onChildUpdate" @close="onChildClose" v-if="shareInfo && (!route.meta.needsPrefetch || prefetch) && route.meta.modal"></router-view>
  <div class="container is-fluid">
    <div class="columns">
      <div class="column px-0 mx-90">
        <template v-if="shareInfo">
          <FileList :share-info="shareInfo" :addons="addons" v-if="shareInfo && viewMode === 'files'" />
          <MapList :share-info="shareInfo" :addons="addons" v-if="shareInfo && viewMode === 'maps'" />
          <div class="has-text-centered box has-background-warning-light" v-else>
            <p class="title is-4 mt-4">
              Unknown view mode
            </p>
            <p class="subtitle is-4 mt-4 mb-4">No view <b>{{ viewMode }}</b> is known, change the mode to a valid mode on the right.</p>
          </div>
        </template>
        <div class="has-text-centered box has-background-danger-light" v-else-if="error">
          <p class="title is-3 mt-4"><Icon icon="exclamation-triangle" icon-class="pr-6 has-text-danger">Loading Files Failed</Icon></p>
          <p class="subtitle is-4 mt-4 mb-4">{{error}}</p>
        </div>
        <div class="has-text-centered box has-background-info-light" v-else style="vertical-align: middle">
          <p class="title is-3 mt-4"><Icon icon="spinner" spin icon-class="pr-6">Loading files...</Icon></p>
          <p class="subtitle is-4 mt-4 mb-4">This may take some time, please wait...</p>
        </div>
      </div>
      <div class="column is-3">
        <div class="box">
          <h5 class="title is-4" v-if="ready">{{filteredAddons.length}} files
              <a class="button is-info is-pulled-right is-inline" @click="fetchAddons()" :disabled="ready ? undefined : true">
                <Icon icon="fa-sync"></Icon>
              </a>
          </h5>
          <h5 class="title is-4" v-else>- files
            <a class="button is-info is-pulled-right is-inline" disabled>
              <Icon icon="fa-sync"></Icon>
            </a>
          </h5>
          <Field label="Selected Share" icon-left="folder">
            <div class="select">
              <select v-model="selectedShare">
                <option v-for="share in shares" :key="share.name" :value="share.id">
                  {{share.name}}
                </option>
              </select>
            </div>
          </Field>
            <div class="buttons" v-if="ready">
              <router-link :to="{ name: 'workshop-download', params: route.params }" class="button is-info is-fullwidth" data-tooltip="Download a workshop addon">
                <Icon icon="fa-plus">Workshop Addon</Icon>
              </router-link>
              <router-link :to="{ name: 'upload-addon', params: route.params }" class="button is-info is-fullwidth" data-tooltip="Upload a file manually">
                <Icon icon="fa-upload">Upload</Icon>
              </router-link>
            </div>
        </div>
        <div class="box">
          <h4 class="title is-4">View Mode:</h4>
          <div class="tabs is-fullwidth is-toggle">
            <ul>
              <li :class="{'is-active': viewMode === 'files'}"><router-link :to="{params:{viewMode: 'files'}}">Files</router-link></li>
              <li :class="{'is-active': viewMode === 'maps'}"><router-link :to="{params:{viewMode: 'maps'}}">Maps</router-link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onMounted, markRaw, shallowRef } from 'vue'
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import Field from '@/components/Field.vue'
import { formatDate, formatSize } from '@/js/util.js'
import { ShareInfo, WorkshopItem } from '../../../../common-types/Share';
import debounce from '@/js/debounce.js';
import { notify } from '@kyvg/vue3-notification';
import FileList from '@/components/addons/FileList.vue';
import MapList from '@/components/addons/MapList.vue';

export interface AddonUpdatePayload {
  deleted?: boolean,
  installInfo?: Record<string, boolean>
}

/// SORT FUNCTIONS
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


let addons: any[] = []
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

// Use for <select> element, to change route
let selectedShare = ref<string>()
watch(selectedShare, async (value) => {
  if(!value) return
  router.replace({
    params: {shareId: value},
  })
})

watch(() => route.params.shareId, (share) => _setShare(share as string))
async function _setShare(shareId: string) {
  if(!shareId) {
    return
    // return router.replace({ name: "admin-shares" })
  }
  const share = shares.value.find(share => share.id === shareId)
  if(!share) {
    notify({
      type: "warn",
      text: `A share does not exist with id ${shareId}`
    })
    router.replace({ name: "admin-shares" })
  } else {
    selectedShare.value = shareId
    await fetchAddons()
    openSelectedAddon()
  }
}
watch(() => route.name, (name) => {
  if(route.name === "admin-shares") {
    ready.value = false
    error.value = undefined
    addons = []
    filteredAddons.value = []
    prefetch.value = undefined
  } else if(route.name === "list-addons") {
    prefetch.value = undefined
    error.value = undefined
  } else {
    openSelectedAddon()
  }
})
watch(() => route.params.addon, openSelectedAddon)
function openSelectedAddon() {
  if(route.name === "collection-info") {
    prefetch.value = addons.find(addon => addon.collection?.id === route.params.collection)
  } else if(route.name === "file-info") {
    let addon = undefined
    for(const item of addons) {
      if(item.children) {
        const child = item.children.find((child: WorkshopItem) => {
          return child.filename === route.params.addon
        })
        if(child) {
          addon = child
          break
        }
      } else if(item.id === route.params.addon) {
        addon = item
        break
      }
    }
    prefetch.value = addon
  } else {
    return
  }

  if(!prefetch.value) {
    notify({
      type: "warn",
      text: `Could not find item`
    })
  }
}

let shares = ref<ShareInfo[]>([])
let shareInfo = ref()
const computedTotalFileSize = ref<number>(0)

const viewMode = computed({
  get() {
    return route.params.viewMode
  },
  set(mode) {
    router.push({
      ...route,
      params: {
        ...route.params,
        viewMode: mode
      }
    })
  }
})

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
  filterAndSortDebounce()
}
const filteredAddons = shallowRef<any[]>([])
function filterAndSort() {
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
  let filtered
  if(query) {
    filtered = addons.filter(addon => {
      // Search the collection's name and it's children instead:
      if(addon.collection) {
        return addon.collection.name.toLowerCase().includes(query)
        || addon.children.some((child: any) => child.filename.toLowerCase().includes(query)
        || (child.workshop && child.workshop.title.toLowerCase().includes(query)))
      }
      return (addon.filename.toLowerCase().includes(query)
        || (addon.workshop && addon.workshop.title.toLowerCase().includes(query))
      )
    })
  } else {
    filtered = addons
  }

  let totalSize = 0
  for(const entry of filtered) {
    const size = entry.workshop ? entry.workshop.filesize : entry.filesize
    if(!isNaN(size))
      totalSize += Number(size)
    else
      console.warn('no size', entry)
  }
  computedTotalFileSize.value = totalSize
  filteredAddons.value = markRaw(filtered.sort(_sort))
}
const filterAndSortDebounce = debounce(filterAndSort, 400)

function getRoute(entry: any) {
  if(entry.collection) {
    return {
      name: "collection-info",
      params: {
        shareId: route.params.shareId,
        collection: entry.collection.id,
        title: entry.collection.title
      }
    }
  } else {
    return {
      name: "file-info",
      params: {
        shareId: route.params.shareId,
        addon: entry.filename,
      }
    }
  }
}

function getTooltip(addon: any) {
  if(!addon.enabledOn) {
    console.warn('missing enabledOn', { ... addon })
  }
  if(addon.enabledOn?.length > 0) {
    return `Filename: ${addon.filename}\nEnabled on:\n\t${addon.enabledOn.join("\n\t")}`
  } else {
    return `Filename: ${addon.filename}\nNot enabled on any servers`
  }
}

async function onChildUpdate(payload: AddonUpdatePayload) {
  if(payload.deleted) {
    for(let i = 0; i < addons.length; i++) {
      if(prefetch.value.filename === addons[i].filename) {
        addons.splice(i, 1)
        console.debug('deleted entry')
        prefetch.value = undefined
        break;
      }
    }
  } else if(payload.installInfo) {
    for(let i = 0; i < addons.length; i++) {
      if(prefetch.value.filename === addons[i].filename) {
        console.debug('updated entry', Object.assign({}, addons[i].installInfo), Object.assign({}, payload.installInfo))
        addons[i].installInfo = payload.installInfo
        formatAddonEntryEnabledOn(addons[i])
        break;
      }
    }
  }
}

function onChildClose() {
  router.replace({ name: "admin-share-detail", params: { shareId: route.params.shareId, viewMode: "files" } })
}

async function fetchShares() {
  error.value = undefined
  shares.value = []
  try {
    const response = await fetch(`/api/shares`)
    const json = await response.json()
    if(response.ok) {
      shares.value = json.map((share: ShareInfo) => {
        const serversCount = Object.values(share.destinations).reduce((pv, cv) => {
          if(cv.serverIds) return pv + cv.serverIds.length
          return pv
        }, 0)
        return {
          serversCount,
          ...share
        }
      })
    } else {
      error.value = json.error ? `${json.error}: ${json.message}` : response.statusText
    }
  } catch(err: any) {
    error.value = err.message || err
  }
}

async function fetchAddons() {
  ready.value = false
  error.value = undefined
  shareInfo.value = undefined
  addons = []
  hasAnyWorkshop.value = false
  try {
    const response = await fetch(`/api/shares/${route.params.shareId}/addons`)
    const json = await response.json()
    if(response.ok) {
      shareInfo.value = json.shareInfo
      addons = json.addons.map((entry: any) => formatAddonEntry(entry))
      ready.value = true
      filterAndSort()
    } else {
      error.value = json.error ? `${json.error}: ${json.message}` : response.statusText
    }
  } catch(err: any) {
    error.value = err.message || err
  }
}
function formatAddonEntryEnabledOn(entry: any) {
  if(entry.collection) {
    for(let child of entry.children) {
      child.enabledOn = child.installInfo ? Object.entries(child.installInfo).filter(([key, value]) => value).map(([key]) => key) : []
    }
  } else {
    entry.enabledOn = Object.entries(entry.installInfo).filter(([key, value]) => value).map(([key]) => key)
  }
}

function formatAddonEntry(entry: any) {
  formatAddonEntryEnabledOn(entry)

  if(entry.workshop) {
    hasAnyWorkshop.value = true
    if(entry.workshop.deleted) {
      entry.workshop = null
      return entry
    }
    entry.workshop.url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${entry.filename.slice(0, -4)}`
  }
  entry.id = entry.filename ?? entry.collection.id
  return entry
}

onMounted(async() => {
  await fetchShares()
  if(route.params.shareId) {
    await _setShare(route.params.shareId as string)
  }
})

</script>

<style scope>
.column-separator {
  border-left: solid 1px!important;
}
td {
  vertical-align: middle !important;
}
.collection-row {
  background-color: rgb(243, 244, 246);
}
</style>
