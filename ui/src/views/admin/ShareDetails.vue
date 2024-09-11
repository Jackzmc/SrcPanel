<template>
<div>
  <div class="notification is-warning is-light">
    <strong>Notice: Work in progress, updating or downloading new files may not update map/file lists. Refresh the page to for now.</strong>
  </div>
  <router-view :share="shareInfo" :addon="prefetch" @update="onChildUpdate" @close="onChildClose" v-if="shareInfo && (!route.meta.needsPrefetch || prefetch) && route.meta.modal"></router-view>
  <div class="container is-fluid">
    <div class="columns">
      <div class="column px-0 mx-90">
        <template v-if="shareInfo">
          <FileList :share-info="shareInfo" :addons="addons" v-if="shareInfo && viewMode === 'files'" />
          <MapList :share-info="shareInfo" :addons="addons" :map-stats="mapStats" v-else-if="shareInfo && viewMode === 'maps'" />
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
          <h5 class="title is-4" v-if="ready">{{ shownFileCount }} files
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

const route = useRoute()
const router = useRouter()

let addons = ref<any[]>([])
let mapStats = ref<Record<string, any>>({})
let ready = ref(false)
let prefetch = ref<any>()
let error = ref<string>()
let hasAnyWorkshop = ref(false)

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
    await fetchMapStats()
  }
}
watch(() => route.name, (name) => {
  if(route.name === "admin-shares") {
    ready.value = false
    error.value = undefined
    addons.value = []
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
    prefetch.value = addons.value.find(addon => addon.collection?.id === route.params.collection)
  } else if(route.name === "file-info") {
    let addon = undefined
    for(const item of addons.value) {
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

const shownFileCount = computed(() => {
  if(!addons.value) return 0
  if(viewMode.value === "maps")
    return addons.value.filter(a => a.chapterIds).length
  else
    return addons.value.length
})

async function onChildUpdate(payload: AddonUpdatePayload) {
  if(payload.deleted) {
    for(let i = 0; i < addons.value.length; i++) {
      if(prefetch.value.filename === addons.value[i].filename) {
        addons.value.splice(i, 1)
        console.debug('deleted entry')
        prefetch.value = undefined
        break;
      }
    }
  } else if(payload.installInfo) {
    for(let i = 0; i < addons.value.length; i++) {
      if(prefetch.value.filename === addons.value[i].filename) {
        console.debug('updated entry', Object.assign({}, addons.value[i].installInfo), Object.assign({}, payload.installInfo))
        addons.value[i].installInfo = payload.installInfo
        formatAddonEntryEnabledOn(addons.value[i])
        break;
      }
    }
  }
}

function onChildClose() {
  router.replace({ name: "admin-share-detail", params: { shareId: route.params.shareId, viewMode: route.params.viewMode} })
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
  addons.value = []
  hasAnyWorkshop.value = false
  try {
    const response = await fetch(`/api/shares/${route.params.shareId}/addons`)
    const json = await response.json()
    if(response.ok) {
      shareInfo.value = json.shareInfo
      addons.value = json.addons.map((entry: any) => formatAddonEntry(entry))
      ready.value = true
    } else {
      error.value = json.error ? `${json.error}: ${json.message}` : response.statusText
    }
  } catch(err: any) {
    error.value = err.message || err
  }
}
async function fetchMapStats() {
  try {
    // TODO: fetch 'stats.jackz.me' from panel settings
    const response = await fetch(`https://stats.jackz.me/api/maps`)
    if(response.ok) {
      const json = await response.json()
      let rc: Record<string, any> = {}
      for(const row of json) {
        rc[row.map.id] = row
      }
      mapStats.value = rc
    }
  } catch(err) {
    console.error("Failed to fetch map statistics:", err)
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
