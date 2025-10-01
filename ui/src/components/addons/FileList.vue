<template>
  <table class="table is-fullwidth" cellspacing="0">
    <thead>
      <tr>
        <th style="min-width:400px">
          <Field icon-left="search">
            <input type="text" class="input" placeholder="Search for a file" v-model="search"
              @input="filterAndSortDebounce" />
          </Field>
        </th>
        <th></th>
        <th data-tooltip="Total file size of all addons" style="vertical-align:bottom">
          {{ formatSize(computedTotalFileSize, true, 0) }}</th>
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
        <tr :class="{'has-background-info-light': addon.collection }">
          <td>
            <router-link v-if="addon.collection" :to="getRoute(addon)">
              <b class="has-text-dark is-underlined">{{addon.collection.name}}</b>&nbsp;
              <span class="tag is-dark is-pulled-right">Collection</span>
            </router-link>
            <router-link :to="getRoute(addon)"
              :class="{'has-text-weight-light': addon.enabledOn.length === 0, 'has-text-grey': addon.enabledOn.length === 0 }"
              v-else :data-tooltip="getTooltip(addon)">
              {{addon.workshop ? addon.workshop.title : addon.filename}}
            </router-link>
            <span class="tag is-success ml-1" v-if="addon.meta?.chapterIds">Map</span>
            <span class="tags is-inline is-pulled-right" v-if="!addon.collection">
              <span class="tag mr-1 is-rounded is-info" v-for="server in addon.enabledOn" :key="server">
                {{ server }}
              </span>
            </span>
            <!-- <span class="tag" v-if="!addon.collection" data-tooltip="Number of servers the addon is installed on">{{ addon.enabledOn.length }} servers</span> -->
          </td>
          <td v-if="hasAnyWorkshop">
            <template v-if="addon.workshop">
              <span class="has-text-danger" v-if="addon.workshop.delete"
                data-tooltip="Item has been deleted or private">Deleted</span>
              <a v-else :href="addon.workshop.url" class="button is-small" target="_blank"
                data-tooltip="Open a new tab to the workshop entry page">
                <Icon icon="fab fa-steam" button>Workshop</Icon>
              </a>
            </template>
            <a v-else-if="addon.collection"
              :href="'https://steamcommunity.com/workshop/filedetails/?id=' + addon.collection.id" class="button is-small"
              target="_blank" data-tooltip="Open a new tab to the workshop entry page">
              <Icon icon="fab fa-steam" button>Workshop</Icon>
            </a>
          </td>
          <td :colspan="addon.collection ? 3 : 1">
            <span>{{formatSize(addon.workshop?.filesize ?? addon.filesize, true, 0)}}</span>
          </td>
          <template v-if="!addon.collection">
            <td>
              <span
                :data-tooltip="formatDate(addon.workshop?.lastUpdated ?? addon.lastModified)">{{formatDate(addon.workshop?.lastUpdated ?? addon.lastModified, true)}}</span>
            </td>
            <td>
              <span :data-tooltip="formatDate(addon.downloaded)">{{formatDate(addon.downloaded, true)}}</span>
            </td>
          </template>
        </tr>
        <template v-if="addon.collection">
          <tr v-for="child in addon.children" :key="child.filename" class="collection-row">
            <td>
              <Icon icon="arrow-turn-up" rotate="90" />
              <router-link v-if="child.workshop" class="has-text-info" :to="getRoute(child)"
                :data-tooltip="getTooltip(child)">
                <b>{{child.workshop.title}} </b>
              </router-link>
              <router-link :to="getRoute(child)" v-else class="ml-5"
                :data-tooltip="getTooltip(child)">{{child.filename}}</router-link>
              <span class="tag is-small is-success ml-1" v-if="addon.meta?.chapterIds">Map</span>
              <span class="tags is-inline is-pulled-right" v-if="!child.collection">
                <span class="tag is-info is-rounded" v-for="server in child.enabledOn" :key="server">
                  {{ server }}
                </span>
              </span>
            </td>
            <td v-if="hasAnyWorkshop">
              <a v-if="child.workshop" :href="child.workshop.url" class="button is-small" target="_blank"
                data-tooltip="Open a new tab to the workshop entry page">
                <Icon icon="fab fa-steam" button>Workshop</Icon>
              </a>
            </td>
            <td>
              <span
                :data-tooltip="formatSize(child.workshop?.filesize ?? child.filesize, true, 2)">{{formatSize(child.workshop?.filesize ?? child.filesize, true, 0)}}</span>
            </td>
            <td>
              <span
                :data-tooltip="formatDate(child.workshop?.lastUpdated ?? child.lastModified)">{{formatDate(child.workshop?.lastUpdated ?? child.lastModified, true)}}</span>
            </td>
            <td>
              <span :data-tooltip="formatDate(child.downloaded)">{{formatDate(child.downloaded, true)}}</span>
            </td>
          </tr>
        </template>
      </template>
    </tbody>
  </table>
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


let search = ref<any>()
let prefetch = ref<any>()
let error = ref<string>()
let hasAnyWorkshop = ref(false)
let sort = ref<{
  id: string,
  func: (a: object, b: object) => number,
  descending: boolean
} | undefined>()

const props = defineProps<{
  shareInfo: ShareInfo,
  addons: any[],
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
function setSortFunc(id: string, sortFunc: (a: object, b: object) => number) {
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

      const { id, descending, func } = sort.value! as { column: string, id: string, descending: boolean, func: (a: object, b: object) => number }
      if(descending) {
        return func(b, a)
      } else {
        return func(a, b)
      }
    }
  }
  let filtered
  if(query) {
    filtered = props.addons.filter(addon => {
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
    filtered = props.addons
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
