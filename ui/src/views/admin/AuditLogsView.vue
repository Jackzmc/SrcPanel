<template>
<div class="container is-fluid">
  <div class="columns">
    <div class="column is-8 box" v-if="!entries || showLoading">
      <p class="has-text-centered is-size-5" style="margin-top:20%">
        <Icon icon="spinner" spin>Loading...</Icon>
        <br>
        {{ loadingDuration }}s
      </p>
    </div>
    <div class="column is-8 box" v-else style="vertical-align: middle">
      <div class="list-item message is-info" ref="infiniteScroll" v-show="infiniteScrollLoading === 'top'">
        <div class="list-item-content has-text-centered" style="text-decoration: none">
          <p>
            <Icon icon="spinner" spin>Fetching newer entries...</Icon>
          </p>
        </div>
      </div>
      <InfiniteLoading @infinite="loadTopContent" />
      <div class="has-text-centered is-size-5" v-if="entries.length === 0" style="margin-top:12%">
        <p>No entries were found within year {{ dataSource }}</p>
        <p>Try searching in a different year</p>
        <br>

        <Field label="Data Year">
            <div class="select">
              <select v-model="dataSource" @change="fetchDebounce">
                <option v-for="(year) in dataSources" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>
          </Field>
      </div>
      <div class="list has-visible-pointer-controls has-hoverable-list-items" v-else>
        <div class="list-item  message has-background-info-light" v-if="pendingEntries.length > 0">
          <a class="list-item-content has-text-centered" style="text-decoration: none" @click="viewPendingEntries">
            <p class="">
              <Icon icon="fa-message" />{{ pendingEntries.length }}{{ pendingEntries.length >= limit ? '+' : ''}}  new entries are available, click here to view
            </p>
          </a>
        </div>
        <template v-for="entry in entries" :key="entry.id">
          <div :class="['list-item', {'has-background-primary': entry.id == Number(filters.aroundId)}]" @mouseenter="hoverId = entry.id">
            <div class="list-item-image" v-if="entry.client.avatarUrl || entry.target.avatarUrl">
              <figure class="image is-48x48">
                <img class="is-rounded" :src="entry.client.avatarUrl || entry.target.avatarUrl">
              </figure>
            </div>

            <div class="list-item-content">
              <div class="list-item-title">
                {{ formatDate(entry.timestamp) }}
                <span class="ml-2 has-text-grey-light is-inline subtitle is-6">{{ getRelDate(entry.timestamp) }}</span>
                <span class="field is-grouped is-grouped-multiline is-pulled-right">
                  <div class="control">
                    <div class="tags has-addons">
                      <span class="tag is-dark">Server</span>
                      <span class="tag is-info">{{ entry.server }}</span>
                    </div>
                  </div>
                </span>
              </div>
              <div class="list-item-description">
                <LogMessage :log="entry" :priv-user="privUser" :hover-id="hoverId" :highlight-regex="highlightRegex" />
                </div>
            </div>

            <div class="list-item-controls">
              <div class="buttons is-right">
                <button class="button has-text-white" @click="entry.showDetails = !entry.showDetails">
                  <Icon icon-class="is-small has-text-black" :icon="entry.showDetails ? 'fa-chevron-up' : 'fa-chevron-down'" />
                </button>
              </div>
            </div>
          </div>
          <div class="list-item  px-0 mx-0 my-0 py-0" v-if="entry.showDetails">

            <div class="list-item-content has-background-light-gray">
                <table class="table is-bordered is-fullwidth">
                  <tbody>
                    <tr>
                      <th style="width:20%">
                        Id
                      </th>
                      <td class="">
                        <span class="mr-2">#{{ entry.id }}</span>
                        <div class="buttons is-inline">
                          <a class="button is-small" @click="copyShareLink(entry)" data-tooltip="Click to copy a shareable link">
                            <span class="icon is-medium">
                              <Icon icon="fa-copy" />
                            </span>
                            <span>Share</span>
                          </a>
                          <a class="ml-2 button is-small is-info" @click="jumpTo(entry)" data-tooltip="Shows messages around this message, ignoring filters">find nearby entries</a>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <th>Timestamp</th>
                      <td>{{ getTimestamp(entry) }}</td>
                    </tr>
                    <tr>
                      <th>Client ID</th>
                      <td><span v-if="entry.client.steamid">{{ entry.client.steamid }}</span><em v-else>-</em></td>
                    </tr>
                    <tr>
                      <th>Target ID</th>
                      <td><span v-if="entry.target.steamid">{{ entry.target.steamid }}</span><em v-else>-</em></td>
                    </tr>
                    <tr>
                      <th>Raw Message</th>
                      <td>{{ entry.rawMessage }}</td>
                    </tr>
                    <tr v-if="entry.via">
                      <th>Via <Icon icon="info-circle" icon-class="has-text-info has-tooltip-right" data-tooltip="Where the log orginated from"></Icon></th>
                      <td>{{ entry.via }}</td>
                    </tr>
                    <tr v-if="entry.metadata">
                      <th>Metadata</th>
                      <td>
                        <table class="table is-bordered">
                          <tbody>
                            <tr v-for="(val, key) in entry.metadata" :key="key">
                              <th>{{ key }}</th>
                              <td>
                                <em v-if="val === null">null</em>
                                <span v-else>{{ val }}</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
            </div>
          </div>
        </template>
      </div>
      <InfiniteLoading @infinite="loadBottomContent"  />
      <div class="list-item message is-info" ref="infiniteScroll" v-show="infiniteScrollLoading === 'bottom'">
        <div class="list-item-content has-text-centered" style="text-decoration: none">
          <p>
            <Icon icon="spinner" spin>Fetching older entries...</Icon>
          </p>
        </div>
      </div>
    </div>
    <div class="column">
      <div class="box" style="position: sticky; top: 4em">
        <h4 class="title is-4">
          {{ totalEntries.toLocaleString() }} entries
          <a :disabled="loadingTime" :class="['button','is-pulled-right','is-info',{'is-loading': loadingTime || !entries}]" @click="search">
            <Icon icon="refresh">Refresh</Icon>
          </a>
        </h4>
      <Field label="Search Client" icon-left="search">
        <SimpleTypeahead
          placeholder="Search for a client"
          class="input"
          @onInput="searchUsers"
          @selectItem="onSelectUser('client', $event)"
          :items="userSearchItems"
          :item-projection="projectUser"
          @onBlur="onUserSearchBlur('client', $event)"
        />
      </Field>
      <Field label="Search Target" icon-left="search">
        <SimpleTypeahead
          placeholder="Search for a target"
          class="input"
          @onInput="searchUsers"
          @selectItem="onSelectUser('target', $event)"
          :items="userSearchItems"
          :item-projection="projectUser"
          @onBlur="onUserSearchBlur('target', $event)"
        />
      </Field>
      <Field label="Search Message" icon-left="search">
        <input type="text" class="input" placeholder="Search messages" v-model="filters.message" @change="fetchDebounce" />
      </Field>
      <Field>
        <label class="label">
          Enabled Types
          <a class="is-inline" @click="clearFilter('types')">(Clear)</a>&nbsp;
          <a @click="selectAllFilter('types')">(Select All)</a>
        </label>
        <div class="buttons">
          <a
            v-for="(value, key) of FILTER_DATA.types" :key="key"
            :class="['button', 'is-small', getFilterColor('types', key)]"
            @click="toggleFilter('types', key)"
          >
            {{ key }}
          </a>
        </div>
      </Field>
      <Field>
        <label class="label">
          Enabled Sources
          <a class="is-inline" @click="clearFilter('servers')">(Clear)</a>&nbsp;
          <a @click="selectAllFilter('servers')">(Select All)</a>
        </label>
        <div class="buttons has-addons">
          <a
            v-for="(key) of logInfo.servers" :key="key"
            :class="['button', 'is-small',  getFilterColor('servers', key)]"
            @click="toggleFilter('servers', key)"
          >
            {{ key }}
          </a>
        </div>
      </Field>
      <div class="columns">
        <div class="column is-4">
          <Field label="Around Id">
            <input v-model="filters.aroundId" type="number" class="input" min="0" @change="fetchDebounce" placeholder="####" />
          </Field>
        </div>
        <div class="column is-6">
          <Field label="Data Year">
            <div class="select is-fullwidth">
              <select v-model="dataSource" @change="fetchDebounce">
                <option v-for="year in dataSources" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>
            <template v-slot:hint_info>
              Fetch data from a certain year
            </template>
          </Field>
        </div>
      </div>
    </div>
  </div>
  </div>
  <br>
</div>
</template>


<script setup lang="ts">
import { useNotification } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User';
import { ref, onBeforeMount, computed, onBeforeUnmount, onUnmounted, onMounted } from 'vue';
import { formatDate, getRelDate, request, requestTimeout } from '@/js/util';
import LogMessage from '@/components/LogMessage.vue';
import Field from '@/components/Field.vue';
import debounce from '@/js/debounce';
import { useRoute, useRouter } from 'vue-router';
//@ts-ignore
import SimpleTypeahead from 'vue3-simple-typeahead';
import 'vue3-simple-typeahead/dist/vue3-simple-typeahead.css'
//@ts-ignore
import InfiniteLoading from "v3-infinite-loading";

const route = useRoute()
const router = useRouter()
const { notify } = useNotification();

const REFRESH_INTERVAL = 12_000
const MAX_REQUEST_TIME = 1000 * 110 // 110 seconds max, any more and CF may kick in

const DEFAULT_TYPES = ["ACTION", "CHAT", "INFO", "STATE", "QUIT", "JOIN"];
const DEFAULT_SERVERS = ["main", "reserved", "randomizer"];
const DEFAULT_LIMIT = 30

const FILTER_DATA: Record<string, Record<string, boolean | string>> = {
  servers: {
    web: "is-info",
    main: "is-success",
    reserved: "is-dark",
  },
  types: {
    ACTION: "is-info",
    CHAT: "is-secondary",
    STATE: "is-primary",
    QUIT: "is-danger",
    JOIN: "is-success",
    INFO: "is-link",
  },
  // Just indicate this a valid filter:
  client: {},
  target: {},
  message: {}
}
const ADMINCHAT_REGEX = new RegExp(/triggered (sm_say|sm_chat) \(text (.*)\s*\)/);
const CONSOLE_SAY_REGEX = new RegExp(/(sm_say|sm_chat) "?([^"]*)"?/)

const props = defineProps<{
  privUser: PrivilegedUser
}>();

let userSearchItems = ref([])
let now = ref()
let loadingTime = ref<number|undefined>(Date.now())
let showLoading = ref<boolean>(true)
let hoverId = ref()
let limit = ref(DEFAULT_LIMIT);
let totalEntries = ref(0)
let entries = ref<LogEntry[]>()
let dataSource = ref<number>(new Date().getFullYear())
let filters = ref<Record<string, string|string[]|null>>({
  servers: DEFAULT_SERVERS,
  types: DEFAULT_TYPES,
  client: null,
  target: null,
  aroundId: null
});
interface LogEntryUser {
  steamid: string,
  name: string,
  avatarUrl?: string
}
interface LogEntry {
  id: number,
  timestamp: number,
  server: string,
  type: string,
  adminChat: boolean,
  via?: string,
  client: LogEntryUser,
  target: LogEntryUser,
  metadata: Record<string, any>,
  message: string,
  rawMessage: string,
  showDetails: boolean
}
let pendingEntries = ref<LogEntry[]>([])
let infiniteScroll = ref()
let infiniteScrollLoading = ref<"top"|"bottom">()

let fetchAbort: AbortController | null = null
let logInfo = ref<{servers: string[], cache:Record<string,{totalRows:number,highestId:number}>}>({servers:[],cache:{}})
let firstLoad = false

const highlightRegex = computed(() => {
  return filters.value.message ? new RegExp(`(${filters.value.message})`, 'ig') : undefined
})
const loadingDuration = computed(() => {
  if(!loadingTime.value) return "0.0"
  return Math.max(((now.value - loadingTime.value) / 1000), 0).toFixed(1)
})
const dataSources = computed(() => {
  if(!logInfo.value?.cache) return []
  // A cache value of null is provided for absolute totals, we ignore it
  // The list is also ascending, so just reverse it. Maybe in future order it just in case
  return Object.keys(logInfo.value.cache).filter(key => key != "null").reverse()
})

async function searchUsers(e: any) {
  if(!e.input || e.input.length < 3) return userSearchItems.value = []
  const response = await request(`/api/users/search/${e.input}`)
  if(response?.ok) {
    const json = await response.json()
    userSearchItems.value = json.users
  }
}
function projectUser(user: any) {
  return `${user.name} (${user.steamid})`
}
function onSelectUser(filter: string, user: any) {
  filters.value[filter] = user.steamid
  fetchDebounce()
}
function onUserSearchBlur(filter: string, event: any) {
  if(event.input.length < 3) {
    filters.value[filter] = null
    fetchDebounce()
  }
}
function clearFilter(filter: string) {
  filters.value[filter] = [];
  updateParams()
  search()
}

function selectAllFilter(filter: string) {
  filters.value[filter] = Object.keys(FILTER_DATA[filter])
  updateParams()
  search()
}

function viewPendingEntries() {
  if(!entries.value) return
  entries.value = [...pendingEntries.value, ...entries.value.slice(0, -pendingEntries.value.length) ]
  pendingEntries.value = []
}

function toggleFilter(filter: string, key: string) {
  if(filters.value[filter] && Array.isArray(filters.value[filter])) {
    let v = filters.value[filter] as string[]
    let index = v.indexOf(key)
    if(index > -1)
      v.splice(index, 1)
    else
      v.push(key)
  }
  fetchDebounce()
}
function getFilterColor(filter: string, key: string) {
  if(!filters.value[filter] || !Array.isArray(filters.value[filter])) return
  if(!filters.value[filter]!.includes(key)) return
  return FILTER_DATA[filter][key] !== true ? FILTER_DATA[filter][key] : undefined
}

function getParams() {
  // if(!entries.value) return ''
  const searchParams = new URLSearchParams()
  // searchParams.append('page', page.value.toString())
  searchParams.append('limit', limit.value.toString())
  searchParams.append('source', dataSource.value.toString())
  for(const [filter, val] of Object.entries(filters.value)) {
    if(!val) continue
    if(Array.isArray(val)) {
      if(val.length > 0)
        searchParams.append(filter, val.join("+"))
    } else {
      searchParams.append(`search_${filter}`, val)
    }
  }
  return searchParams
}
function updateParams() {
  const params = getParams()
  router.replace({ query: Object.fromEntries(params) })
  return params.toString()
}

const cache = computed({
  get() {
    return logInfo.value.cache[dataSource.value]
  },
  set(newValue) {
    logInfo.value.cache[dataSource.value] = newValue
  }
})
async function getInfo() {
  const response = await request("/api/logs/data")
  if(response?.ok) {
    const json = await response.json()
    logInfo.value = json
  } else {
    throw Error(response?.statusText)
  }
}

const fetchDebounce = debounce(search, 1000)
async function search() {
  if(!cache.value) return
  loadingTime.value = Date.now()
  showLoading.value = true
  if(filters.value.aroundId)
    entries.value = await fetchLogs(Number(filters.value.aroundId), "around")
  else
    entries.value = await fetchLogs(cache.value.highestId, "before")
  loadingTime.value = undefined
}
async function loadBottomContent() {
  // Do not fire if loading, or if there is no content available
  if(infiniteScrollLoading.value || !entries.value || entries.value.length == 0 || loadingTime.value !== undefined) return
  console.log('fetching bottom content')
  infiniteScrollLoading.value = "bottom"
  const newEntries = await fetchLogs(idMinMax.value[0] - 1, "before")
  entries.value = [...entries.value, ...newEntries]
  infiniteScrollLoading.value = undefined
}
async function loadTopContent() {
  // Do not fire if loading, or if there is no content available
  if(!firstLoad) {
    firstLoad = true
    return
  }
  if(infiniteScrollLoading.value || !entries.value || entries.value.length == 0 || loadingTime.value !== undefined) return
  if(idMinMax.value[1] === cache.value.highestId) return
  console.log('fetching top content')
  infiniteScrollLoading.value = "top"
  const newEntries = await fetchLogs(idMinMax.value[1] + 1, "after")
  entries.value = [...entries.value, ...newEntries]
  infiniteScrollLoading.value = undefined
}
async function fetchLogs(id: number, mode: "before" | "after" | "around") {
  // Wait for previous request
  loadingTime.value = Date.now()
  const params = updateParams()
  fetchAbort?.abort()

  let response
  try {
    const responseHandle = requestTimeout(`/api/logs/${mode}/${id}?${params}`, MAX_REQUEST_TIME, undefined, {
      title: "Fetch Failure"
    })
    fetchAbort = responseHandle.controller
    response = await responseHandle.start()
    fetchAbort = null
  } catch(err: any) {
    loadingTime.value = undefined
    showLoading.value = false
    if(err.name !== "AbortError")
      throw err
  }

  if(response?.ok) {
    const json = await response.json()
    totalEntries.value = json.cache.totalRows
    const newEntries = json.logs.map((entry: any) => {
      let message = entry.message
      if(entry.metadata && entry.message) {
        for(const key in entry.metadata) {
          message = message.replace(new RegExp(`(%${key}%|{${key}})`, 'g'), `<b data-tooltip="${key}">${entry.metadata[key]}</b>`)
        }
      }
      if(entry.type === 'JOIN') message = " joined"
      else if(entry.type === 'ACTION') {
        const match = entry.message.match(ADMINCHAT_REGEX)
        if(match) {
          entry.adminChat = true
          entry.type = 'CHAT'
          message = match[2]
        }
      }
      if(entry.server === 'web' && entry.metata?.cmd && entry.type.startsWith("servers.rcon.")) {
        const match = entry.metadata.cmd.match(CONSOLE_SAY_REGEX)
        if(match) {
          entry.adminChat = true
          entry.via = 'rcon'
          entry.metadata._type = entry.type
          entry.type = 'CHAT'
          message = match[2]
        }
      }
      const hasValidClient = entry.client?.startsWith("STEAM_")
      const hasValidTarget = entry.target?.startsWith("STEAM_")
      return {
        id: entry.id,
        timestamp: entry.timestamp,
        server: entry.server,
        type: entry.type,
        adminChat: entry.adminChat,
        via: entry.via,
        client: {
          steamid: entry.client,
          name: hasValidClient ? entry.clientName ?? entry.client : null,
          avatarUrl: hasValidClient ? `/api/users/${entry.client}/avatar` : undefined,
        },
        target: {
          steamid: entry.target,
          name: hasValidTarget ? entry.targetName ?? entry.target : null,
          avatarUrl: hasValidTarget ? `/api/users/${entry.target}/avatar` : undefined,
        },
        metadata: entry.metadata,
        message,
        rawMessage: entry.message
      }
    })

    cache.value.highestId = json.cache.highestId
    console.info('Fetch', mode, 'took', json.timeTaken, 'ms')
    loadingTime.value = undefined
    showLoading.value = false
    return newEntries
  }
}
const isTopOfList = computed(() => {
  if(!cache.value) return
  // If our highest id is greater than the cached, its some bug - just act like its the latest
  return idMinMax.value[1] >= cache.value.highestId
})
const idMinMax = computed(() => {
  if(!entries.value || entries.value.length === 0) return [-1, -1]
  let lowestId = -1, highestId = -1
  for(const row of entries.value) {
    if(row.id > highestId || highestId === -1) highestId = row.id
    else if(row.id < lowestId || lowestId === -1) lowestId = row.id
  }
  return [ lowestId, highestId ]
})
function addPendingEntries(entries: LogEntry[]) {
  if(!entries) return
  pendingEntries.value = [ ...pendingEntries.value, ...entries]
}

async function jumpTo(entry: any) {
  // Clear any set messages
  // We assign once to prevent any triggering of fetch before everything is set
  filters.value = {
    ...filters.value,
    message: null,
  }
  router.replace({
    name: "logs-audit",
    params: {
      aroundId: entry.id,
    },
    query: route.query
  })
  await fetchLogs(entry.id, 'around')
}

function getShareLink(entry: LogEntry) {
  const params = getParams()
  params.set('aroundId', entry.id.toString())
  return `${location.protocol}//${window.location.host}${window.location.pathname}/${entry.id}`
}
function getTimestamp(entry: LogEntry) {
  const date = new Date(entry.timestamp * 1000)
  return `${date.toLocaleDateString('sv-SE')} at ${date.toLocaleTimeString()}`
}
async function copyShareLink(entry: any) {
  const link = getShareLink(entry)
  await window.navigator.clipboard.writeText(link)
  notify({
    type: "success",
    text: "Shareable link copied to clipboard"
  })
}

let refreshTimer: any
let nowTimer: any
onMounted(async() => {
  now.value = Date.now()
  nowTimer = setInterval(() => {
    now.value = Date.now()
  }, 100)

  showLoading.value = true
  await getInfo()

  // If /admin/audit/:id is used, fetch that, and just grab filters, but wont be used
  if(route.params.aroundId) {
    const id = Number(route.params.aroundId)
    filters.value['aroundId'] = id.toString()
    entries.value = await fetchLogs(id, "around")
  }

  if(route.query.limit) limit.value = Number(route.query.limit) || DEFAULT_LIMIT
  if(route.query.source) {
    const year = parseInt(route.query.source as string)
    if(!isNaN(year)) dataSource.value = year
  }
  for(const filter in FILTER_DATA) {
    let queryName = filter
    // Some query are prefixed with search_, so we check them:
    if(route.query[queryName] === undefined) queryName = `search_${queryName}`
    if(route.query[queryName] !== undefined) {
      if(Array.isArray(filters.value[filter])) {
        if(route.query[queryName] === "") filters.value[filter] = []
        else filters.value[filter] = (route.query[queryName] as string).split(/[,+]/g)
      } else {
        filters.value[filter] = route.query[queryName] as string
      }
    }
  }

  // We already jumped using "around", so don't fetch before
  if(!route.params.aroundId) entries.value = await fetchLogs(cache.value.highestId, "before")


  refreshTimer = setInterval(async () => {
    // Only check for new values IF we not full, not searching, and at the top of list
    if(isTopOfList.value && fetchAbort == null && pendingEntries.value.length < limit.value) {
      const newEntries = await fetchLogs(cache.value.highestId, "after")

      // don't replace, append non duplicates
      addPendingEntries(newEntries)
    }

  }, REFRESH_INTERVAL)
})

onUnmounted(() => {
  clearInterval(nowTimer)
  clearInterval(refreshTimer)
})
</script>

<style scoped>
.admin-chat {
  color: #f0e359
}
</style>
