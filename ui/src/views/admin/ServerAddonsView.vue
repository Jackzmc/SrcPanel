<template>
<div>
  <router-view :share="shareInfo" :addon="prefetch" @update="onChildUpdate" @close="onChildClose" v-if="shareInfo && (!route.meta.needsPrefetch || prefetch)"></router-view>
  <div class="container" v-if="ready">
    <div class="level">
      <div class="level-left">
        <div class="level-item">
          <h5 class="title is-4">Viewing {{filteredAddons.length}} addons</h5>
        </div>
      </div>
      <div class="level-right">
        <div class="level-item" v-if="shareInfo.downloadSources.steam_workshop">
          <div class="field">
            <label class="label">&nbsp;</label>
            <div class="control">
              <router-link :to="{ name: 'workshop-download', params: route.params }" class="button is-info is-fullwidth">
                <Icon icon="fa-plus">Workshop Addon</Icon>
              </router-link>
            </div>
          </div>
        </div>
        <div class="level-item" v-if="shareInfo.downloadSources.direct" >
          <div class="field">
            <label class="label">&nbsp;</label>
            <div class="control">
              <router-link :to="{ name: 'upload-addon', params: route.params }" class="button is-info is-fullwidth">
                <Icon icon="fa-upload">Upload</Icon>
              </router-link>
            </div>
          </div>
        </div>
        <div class="level-item">
          <Field label="Share" icon-left="folder">
            <div class="select">
              <select v-model="selectedShare">
                <option v-for="share in shares" :key="share.name" :value="share.id">
                  {{share.name}}
                </option>
              </select>
            </div>
          </Field>
        </div>
        <div class="level-item">
          <div class="field">
            <label class="label">&nbsp;</label>
            <div class="control">
              <a class="button is-info is-fullwidth" @click="fetchAddons()">
                <Icon icon="fa-sync"></Icon>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="columns">
      <div class="column">
        <table class="table is-striped is-fullwidth">
          <thead>
            <tr>
              <th>
                <Field icon-left="search">
                  <input type="text" class="input" placeholder="Search" v-model="search" @input="filterAndSortDebounce" />
                </Field>
              </th>
              <th></th>
              <th data-tooltip="Total file size of all addons" style="vertical-align:bottom">{{ formatSize(computedTotalFileSize, true, 0) }}</th>
              <th></th>
              <th></th>
            </tr>
            <tr>
              <th><a @click="setSortFunc('filename', SORT_NAME)">
                File <span v-if="hasAnyWorkshop">/ Workshop </span>Name
                <span v-if="sort?.id === 'filename'">{{sortSymbol}}</span>
                <span class="is-pulled-right">Enabled On</span>
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
                <Icon icon="fa-download">Downloaded</Icon>
                <span v-if="sort?.id === 'downloaded'">{{sortSymbol}}</span>
              </a></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="addon in filteredAddons" :key="addon.id">
              <tr>
                <td>
                  <router-link v-if="addon.collection" :to="getRoute(addon)">
                    <b class="has-text-dark">{{addon.collection.name}}</b>&nbsp;
                    <span class="tag is-dark is-pulled-right">Collection</span>
                  </router-link>
                  <router-link :to="getRoute(addon)" :class="{'has-text-weight-light': addon.enabledOn.length == 0, 'has-text-grey': addon.enabledOn.length == 0 }" v-else :data-tooltip="getTooltip(addon)">
                    {{addon.workshop ? addon.workshop.title : addon.filename}}
                  </router-link>
                  &nbsp;
                  <span class="tags is-inline is-pulled-right" v-if="!addon.collection">
                    <span class="tag is-rounded is-info" v-for="server in addon.enabledOn" :key="server">
                      {{ server }}
                    </span>
                  </span>
                  <!-- <span class="tag" v-if="!addon.collection" data-tooltip="Number of servers the addon is installed on">{{ addon.enabledOn.length }} servers</span> -->
                </td>
                <td v-if="hasAnyWorkshop">
                  <template v-if="addon.workshop">
                    <span class="has-text-danger" v-if="addon.workshop.delete" data-tooltip="Item has been deleted or private">Deleted</span>
                    <a v-else :href="addon.workshop.url" class="button is-small" target="_blank"  data-tooltip="Open a new tab to the workshop entry page">
                      <Icon icon="fab fa-steam" button>Workshop</Icon>
                    </a>
                  </template>
                  <a v-else-if="addon.collection" :href="'https://steamcommunity.com/workshop/filedetails/?id=' + addon.collection.id" class="button is-small" target="_blank"  data-tooltip="Open a new tab to the workshop entry page">
                    <Icon icon="fab fa-steam" button>Workshop</Icon>
                  </a>
                </td>
                <td :colspan="addon.collection ? 3 : 1">
                  <span v-if="addon.workshop">{{formatSize(addon.workshop.filesize, true, 0)}}</span>
                  <span v-else>{{formatSize(addon.filesize, true, 0)}}</span>
                </td>
                <template v-if="!addon.collection">
                <td>
                  <span v-if="addon.workshop">{{formatDate(addon.workshop.lastUpdated)}}</span>
                  <span v-else>{{formatDate(addon.lastModified)}}</span>
                </td>
                <td>
                  <span>{{formatDate(addon.downloaded)}}</span>
                </td>
                </template>
              </tr>
              <template v-if="addon.collection">
                <tr v-for="child in addon.children" :key="child.filename">
                  <td>
                    <router-link v-if="child.workshop" class="has-text-info ml-5" :to="getRoute(child)" :data-tooltip="getTooltip(child)">
                      <b>{{child.workshop.title}}</b>
                    </router-link>
                    <router-link :to="getRoute(child)" v-else class="ml-5" :data-tooltip="getTooltip(child)">{{child.filename}}</router-link>
                    <span class="tags is-inline is-pulled-right" v-if="!child.collection">
                      <span class="tag is-info is-rounded" v-for="server in child.enabledOn" :key="server">
                        {{ server }}
                      </span>
                    </span>
                  </td>
                  <td v-if="hasAnyWorkshop">
                    <a v-if="child.workshop" :href="child.workshop.url" class="button is-small" target="_blank" data-tooltip="Open a new tab to the workshop entry page">
                      <Icon icon="fab fa-steam" button>Workshop</Icon>
                    </a>
                  </td>
                  <td>
                    <span v-if="child.workshop">{{formatSize(child.workshop.filesize, true, 0)}}</span>
                    <span v-else>{{formatSize(child.filesize, true, 0)}}</span>
                  </td>
                  <td>
                    <span v-if="child.workshop">{{formatDate(child.workshop.lastUpdated)}}</span>
                    <span v-else>{{formatDate(child.lastModified)}}</span>
                  </td>
                  <td>
                    <span>{{formatDate(child.downloaded)}}</span>
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
  <div class="container" v-else-if="route.name === 'admin-shares' || !route.params.shareId">
    <h4 class="title is-4">Select a share</h4>
    <div class="columns">
      <div class="column is-6" v-for="share in shares" :key="share.id">
        <router-link class="box has-background-light-02" :to="{name: 'list-addons', params: { shareId: share.id }}">
          <h4 class="title is-4">{{ share.name }} <span v-if="share.appid" data-tooltip="The steam appid for this share" class="tag is-dark is-pulled-right">{{ share.appid }}</span></h4>
          <p class="subtitle is-6">{{ share.description ?? '&nbsp;' }}</p>
          <div class="tags" data-tooltip="Install destinations">
            <span class="tag is-dark" v-for="(dest, id) in share.destinations" :key="id">
              {{ id }}
            </span>
          </div>
          <div class="level mt-1">
            <div class="level-left" data-tooltip="Supported file sources">
              <div class="level-item" v-for="(enabled, source) in share.downloadSources" :key="source">
                <span class="tag is-info">
                  {{ source.replace(/_/g, ' ') }}
                </span>
              </div>
            </div>
            <div class="level-right" data-tooltip="Supported file extensions">
              <div class="level-item" v-for="ext in share.fileExts" :key="ext">
                <span class="tag is-info">
                  {{ ext }}
                </span>
              </div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
  <div v-else-if="!ready">
    <br>
    <p class="title is-2 has-text-centered mt-2"><Icon icon="spinner" spin icon-class="mr-5">Fetching addons...</Icon></p>
    <p class="subtitle is-4 has-text-centered">This may take some time, please wait...</p>
  </div>
  <br>
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
    return router.replace({ name: "admin-shares" })
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
let totalFileSize = 0
const computedTotalFileSize = ref<number>(0)

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
    let totalSize = 0
    for(const entry of filtered) {
      const size = entry.workshop ? entry.workshop.filesize : entry.filesize
      if(size)
        totalSize += size
      else
        console.warn('no size', entry)
    }
    computedTotalFileSize.value = totalSize
  } else {
    filtered = addons
    computedTotalFileSize.value = totalFileSize
  }
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

async function onChildClose() {
  router.replace({ name: "list-addons", params: { shareId: route.params.shareId } })
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
  totalFileSize = 0
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
    totalFileSize += entry.workshop.filesize
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
</style>
