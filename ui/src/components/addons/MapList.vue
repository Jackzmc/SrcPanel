<template>
<div>
  <div class="notification is-warning is-light">
    <strong>Notice:</strong> This view is under development and may not have full functionality.
  </div>
  <div class="columns is-multiline is-1">
    <div class="column is-4" v-for="map in filteredAddons" :key="map.filename">
      <div class="card">
        <div class="card-image">
          <figure class="image is-5by3">
            <router-link :to="getRoute(map)">
              <LazyImage :src="(map.collection ? map.children[0] : map)?.workshop.previewUrl" placeholder-src="/img/WorkshopImageFallback.svg" />
            </router-link>
          </figure>
        </div>
        <div class="card-content">
          <div class="media">
            <div class="media-content">
              <p class="title is-4"><router-link :to="getRoute(map)">{{ map.collection?.name ?? map.workshop?.title ?? map.filename }}</router-link>
                <span class="ml-2 tag is-black is-medium" v-if="map.collection">Collection</span>
                <!-- <Icon icon="fa-star" v-for="i in "></Icon> -->
                 <span class="is-pulled-right">{{ getStats(map)?.avgRating }}</span>
              </p>
              <p class="subtitle is-6">
                {{ formatDescription((map.collection ? map.children[0] : map).workshop?.description) }}
              </p>
            </div>
          </div>

          <div class="">
            <ul>
              <li>{{ map.chapterIds.length }} chapters</li>
              <li>Updated {{ getRelDate(map.collection ? map.children[0].workshop?.lastUpdated : map.workshop?.lastUpdated) }}</li>
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
import { formatDate, formatSize, getRelDate } from '@/js/util.js'
import { ShareInfo, WorkshopItem } from '../../../../common-types/Share';
import debounce from '@/js/debounce.js';
import { notify } from '@kyvg/vue3-notification';
import LazyImage from '../LazyImage.vue';

export interface AddonUpdatePayload {
  deleted?: boolean,
  installInfo?: Record<string, boolean>
}
const route = useRoute()
const router = useRouter()

let addonImageLoaded = ref<Record<string, boolean>>({})
// TODO: pull from stats api
let mapStatsInfo = ref<Record<string, any>>()
let search = ref<any>()
let prefetch = ref<any>()
let error = ref<string>()
let hasAnyWorkshop = ref(false)
let sort = ref<{
  id: string,
  func: Function,
  descending: boolean
} | undefined>()

const props = defineProps<{
  shareInfo: ShareInfo,
  addons: any[],
  mapStats: Record<string, any>
}>()

// Use for <select> element, to change route
let selectedShare = ref<string>()
watch(selectedShare, async (value) => {
  if(!value) return
  router.replace({
    params: {shareId: value},
  })
})

watch(() => selectedShare.value, (name) => {
  if(route.name === "admin-share-detail") {
    prefetch.value = undefined
    error.value = undefined
  } else {
    openSelectedAddon()
  }
})
// TODO: is this necessary anymore?
watch(() => route.params.addon, openSelectedAddon)
function openSelectedAddon() {
  if(route.name === "collection-info") {
    prefetch.value = props.addons.find(addon => addon.collection?.id === route.params.collection)
  } else if(route.name === "file-info") {
    let addon = undefined
    for(const item of props.addons) {
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
  let filtered = props.addons.filter(addon => addon.chapterIds)
  if(query) {
    filtered = filtered.filter(addon => {
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

function getUpdateDuration(time: number) {
  const seconds = (Date.now()/1000) - time
  return seconds / 60 / 60 / 24
}
function formatDescription(content: string) {
  if(!content) return ""
  let output = content.slice(0, 256)
  if(content.length > 256) output += "..."
  return output
}
function getStats(map: any) {
  const lastChapter = map.chapterIds?.at(-1)
  if(!lastChapter) return
  return props.mapStats[lastChapter]
}
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
  // TODO:
  // if(payload.deleted) {
  //   for(let i = 0; i < props.addons.length; i++) {
  //     if(prefetch.value.filename === addons[i].filename) {
  //       addons.splice(i, 1)
  //       console.debug('deleted entry')
  //       prefetch.value = undefined
  //       break;
  //     }
  //   }
  // } else if(payload.installInfo) {
  //   for(let i = 0; i < addons.length; i++) {
  //     if(prefetch.value.filename === addons[i].filename) {
  //       console.debug('updated entry', Object.assign({}, addons[i].installInfo), Object.assign({}, payload.installInfo))
  //       addons[i].installInfo = payload.installInfo
  //       formatAddonEntryEnabledOn(addons[i])
  //       break;
  //     }
  //   }
  // }
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

watch(() => props.addons, () => {
  filterAndSort()
})

onMounted(async() => {
  filterAndSort()
})

</script>

<style scope>
.column-separator {
  border-left: solid 1px !important;
}

td {
  vertical-align: middle !important;
}

.collection-row {
  background-color: rgb(243, 244, 246);
}
</style>
