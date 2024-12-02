<template>
<div>
  <div class="columns">
    <div class="column">
      <Field icon-left="search" style="float: bottom">
        <input type="text" class="input" placeholder="Search maps" v-model="search" @input="filterAndSortDebounce" />
      </Field>
    </div>
    <div class="column">
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Size</label>
        </div>
        <div class="field-body">
          <input type="range" id="volume" name="volume" min="0" :max="CARD_SIZES.length - 1" v-model="cardSizeIndex" />
        </div>
      </div>
    </div>
    <div class="column">
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Sort By</label>
        </div>
        <div class="field-body">
          <Field>
            <div class="select">
              <select v-model="sort.id">
                <option v-for="(data, id) in SORT_OPTIONS" :key="id" :value="id">
                {{data.label}}
                </option>
              </select>
            </div>
          </Field>
          <Field>
            <div class="select">
              <select v-model="sort.direction">
                <option :value="SortDirection.Ascending">(↑) Ascending</option>
                <option :value="SortDirection.Descending">(↓) Descending</option>
              </select>
            </div>
          </Field>
        </div>
      </div>
    </div>
  </div>
  <div class="columns is-multiline is-1">
    <div :class="['column','is-flex',cardSizeClass]" v-for="map in filteredAddons" :key="map.filename">
      <div class="card is-fullwidth">
        <div class="card-image">
          <figure class="image is-5by3">
            <router-link :to="getRoute(map)">
              <LazyImage observer :src="(map.collection ? map.children[0] : map).workshop?.previewUrl"
                placeholder-src="/img/no-map-image.svg"
                error-src="/img/no-map-image.svg"
              />
              <!-- <span class="rating-overlay" v-if="getStats(map)">
                <Icon icon="fa-star" size="sm" v-for="i in Number(getStats(map).avgRating)" :key="i"></Icon>
              </span> -->
              <span class="rating-overlay" v-if="getStats(map)?.numRatings > 0">
                {{ Number(getStats(map).avgRating) }} <Icon icon="fa-star"></Icon>
              </span>
            </router-link>
          </figure>
        </div>
        <div class="card-content">
          <div class="media">
            <div class="media-content">
              <p class="title is-5"><router-link :to="getRoute(map)">{{ map.collection?.name ?? map.workshop?.title ?? map.filename }}</router-link>
                <span class="ml-2 tag is-black" v-if="map.collection">Collection</span>
                 <!-- <span class="is-pulled-right" v-if="getStats(map)">
                    <Icon icon="fa-star" size="sm" v-for="i in Number(getStats(map).avgRating)" :key="i"></Icon>
                 </span> -->
              </p>
              <p class="subtitle is-6" v-if="map.workshop && map.workshop.deleted">
                Addon has been removed from Steam Workshop.
              </p>
              <p class="subtitle is-6" v-else-if="!map.workshop && !map.collection">
                No workshop information available
              </p>
              <p class="subtitle is-6" v-else-if="cardSizeIndex > 0">
                {{ formatDescription((map.collection ? map.children[0] : map).workshop?.description) }}
              </p>
            </div>
          </div>

          <div :class="cardSizeIndex > 0 ? ['columns','is-multiline'] : []">
            <div :class="cardSizeIndex > 0 ? ['column'] : []">
              <ul>
                <li>
                  <Icon icon="clock"  v-if="map.workshop || map.collection">Updated {{ getRelDate((map.collection ? map.children[0].workshop?.lastUpdated : map.workshop?.lastUpdated) ?? map.lastUpdated) }}</Icon>
                  <!-- no workshop data, not collection, fallback to file info: -->
                  <Icon icon="clock" v-else>Downloaded
                    {{ getRelDate(map.downloaded) }}
                  </Icon>
                </li>
                <template v-if="getStats(map)">
                  <li>
                    <Icon icon="clock">Played
                      {{ getRelDate(getStats(map).lastPlayedTime) }}
                    </Icon>
                  </li>
                  <li>
                    <Icon icon="gamepad">Played {{ getStats(map).gamesPlayed.toLocaleString() }} times</Icon>
                  </li>
                </template>
              </ul>
            </div>
            <div :class="cardSizeIndex > 0 ? ['column','is-4','has-text-right'] : []">
              <ul>
                <li>
                  <Icon icon="file">{{ formatSize(map.filesize) }}</Icon>
                </li>
                <li v-if="map.meta">{{ map.meta.chapterIds.length }} chapters</li>
                <li v-if="map.collection">{{ map.children.length }} parts</li>
              </ul>
            </div>
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

enum SortDirection { Ascending, Descending }
const SORT_OPTIONS: Record<string, { label: string, sortFn: (a: any, b: any) => number, defaultDirection: SortDirection }> = {
  none: {
    label: "Default",
    defaultDirection: SortDirection.Ascending,
    sortFn: ( a, b) => 0
  },
  lastUpdated: {
    label: "Last Updated",
    defaultDirection: SortDirection.Descending,
    sortFn: (a, b) => a.lastUpdated - b.lastUpdated
  },
  gamesPlayed: {
    label: "Games Played",
    defaultDirection: SortDirection.Descending,
    sortFn: (a, b) => {
      const aStats = getStats(a)
      const bStats = getStats(b)
      if(!aStats && !bStats) return 0
      if(!aStats) return -1
      if(!bStats) return 1
      return aStats.gamesPlayed - bStats.gamesPlayed
    }
  },
  rating: {
    label: "Rating",
    defaultDirection: SortDirection.Descending,
    sortFn: (a, b) => {
      const aStats = getStats(a)
      const bStats = getStats(b)
      if(!aStats && !bStats) return 0
      if(!aStats) return -1
      if(!bStats) return 1
      return Number(aStats.avgRating) - Number(bStats.avgRating)
    }
  },
  title: {
    label: "Title",
    defaultDirection: SortDirection.Ascending,
    sortFn: (a, b) => {
      const aName: string = a.collection?.name ?? a.workshop?.title ?? a.filename
      const bName: string = b.collection?.name ?? b.workshop?.title ?? b.filename
      return aName.localeCompare(bName)
    }
  },
  random: {
    label: "Random",
    defaultDirection: SortDirection.Ascending,
    sortFn: (a, b) => {
      return Math.random() ? 1 : -1
    }
  }
}
const CARD_SIZES = ["is-3", "is-4", "is-6", "is-12"]

let search = ref<any>()
let prefetch = ref<any>()
let error = ref<string>()
let hasAnyWorkshop = ref(false)
let sort = ref<{
  id: string,
  direction: SortDirection,
}>({ id: "none", direction: SortDirection.Ascending })
let cardSizeIndex = ref<number>(1)

const cardSizeClass = computed(() => {
  return CARD_SIZES[cardSizeIndex.value]
})

const props = defineProps<{
  shareInfo: ShareInfo,
  addons: any[],
  mapStats?: Record<string, any>
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

watch(() => sort.value.id, () => {
  // If direction is the same, then we manually trigger filterSort
  // Changing direction triggers it manually
  if(sort.value.direction != SORT_OPTIONS[sort.value.id].defaultDirection)
    sort.value.direction = SORT_OPTIONS[sort.value.id].defaultDirection
  else
    filterAndSort()
})
watch(() => sort.value.direction, filterAndSort)
const filteredAddons = shallowRef<any[]>([])
function filterAndSort() {
  const query = search.value?.toLowerCase()
  const sortFn = SORT_OPTIONS[sort.value.id].sortFn
  let _sort = (a: any, b: any) => {
    return sort.value.direction === SortDirection.Ascending ? sortFn(a, b) : sortFn(b, a)
  }
  // Filter only maps
  let filtered = props.addons.filter(addon => addon.meta?.chapterIds)
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
  output = output.substring(0, Math.min(output.length, output.lastIndexOf(" ")))
  if(content.length > 256) output += "..."
  return output
}
function getStats(map: any) {
  if(!props.mapStats) return
  const lastChapter = map.meta?.chapterIds?.at(-1)
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

<style scoped>
.column-separator {
  border-left: solid 1px !important;
}

td {
  vertical-align: middle !important;
}

.collection-row {
  background-color: rgb(243, 244, 246);
}
.card.is-fullwidth {
  width: 100%;
}
.rating-overlay {
  position: absolute;
  top: 0;
  right: 0;
  color: white;
  padding: 5px;
  box-shadow: 4px #000;
  background-color: rgba(0, 0, 0, 0.7)
  /* background-color: rgba(255, 255, 255, 0.2) */
}
</style>
