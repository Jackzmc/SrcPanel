<template>
<div class="container is-fluid">
  <div class="columns">
    <div v-if="!entries || showLoading" class="column is-8 box">
      <p class="has-text-centered is-size-5" style="margin-top:20%">
        <Icon v-if="logInfo.loading" icon="spinner" spin>Waiting for log metadata</Icon>
        <Icon v-else icon="spinner" spin>Searching logs</Icon>
        <br>
        {{ loadingDuration }}s
      </p>
    </div>
    <div v-else class="column is-8 box" style="vertical-align: middle">
      <div v-show="infiniteScrollLoading === 'top'" ref="infiniteScroll" class="list-item message is-info">
        <div class="list-item-content has-text-centered" style="text-decoration: none">
          <p>
            <Icon icon="spinner" spin>Fetching newer entries...</Icon>
          </p>
        </div>
      </div>
      <InfiniteLoading @infinite="loadContent('top')" />
      <div v-if="entries.length === 0" class="has-text-centered is-size-5" style="margin-top:12%">
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
      <div v-else class="list has-visible-pointer-controls has-hoverable-list-items">
        <div v-if="pendingEntries.length > 0" class="list-item  message has-background-info-light">
          <a class="list-item-content has-text-centered" style="text-decoration: none" @click="viewPendingEntries">
            <p class="">
              <Icon icon="fa-message" />{{ pendingEntries.length }}{{ pendingEntries.length >= limit ? '+' : '' }}  new entries are available, click here to view
            </p>
          </a>
        </div>
        <template v-for="entry in entries" :key="entry.id">
          <div :class="['list-item', {'has-background-primary-light': entry.id == Number(filters.aroundId)}]" @mouseenter="hoverId = entry.id">
            <div v-if="entry.client.avatarUrl || entry.target.avatarUrl" class="list-item-image">
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
          <div v-if="entry.showDetails" class="list-item  px-0 mx-0 my-0 py-0">

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
                          <a class="button is-small" data-tooltip="Click to copy a shareable link" @click="copyShareLink(entry)">
                            <span class="icon is-medium">
                              <Icon icon="fa-copy" />
                            </span>
                            <span>Share</span>
                          </a>
                          <a class="ml-2 button is-small is-info" data-tooltip="Shows messages around this message, ignoring filters" @click="jumpTo(entry)">find nearby entries</a>
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
        <div ref="infiniteScroll" class="list-item  message has-background-info-light">
          <a class="list-item-content has-text-centered" style="text-decoration: none" @click="viewPendingEntries">
            <p class="">
              <Icon icon="spinner" spin>Fetching older entries...</Icon>
            </p>
          </a>
        </div>
      </div>
      <InfiniteLoading @infinite="loadContent('bottom')" />
    </div>
    <div class="column">
      <div class="box" style="position: sticky; top: 4em">
        <h4 class="title is-4">
          <span v-if="totalEntries">{{ totalEntries.toLocaleString() }} entries</span>
          <span v-else><Icon icon="fa-spinner" spin></Icon> entries</span>
          <a :disabled="loadingTime" :class="['button','is-pulled-right','is-info',{'is-loading': loadingTime || !entries}]" @click="search">
            <Icon icon="refresh">Refresh</Icon>
          </a>
        </h4>
      <Field label="Search Client" icon-left="search">
        <SimpleTypeahead
          placeholder="Search for a client"
          class="input"
          :items="userSearchItems"
          :item-projection="projectUser"
          @onInput="searchUsers"
          @selectItem="onSelectUser('client', $event)"
          @onBlur="onUserSearchBlur('client', $event)"
        />
      </Field>
      <Field label="Search Target" icon-left="search">
        <SimpleTypeahead
          placeholder="Search for a target"
          class="input"
          :items="userSearchItems"
          :item-projection="projectUser"
          @onInput="searchUsers"
          @selectItem="onSelectUser('target', $event)"
          @onBlur="onUserSearchBlur('target', $event)"
        />
      </Field>
      <Field label="Search Message" icon-left="search">
        <input v-model="filters.message" type="text" class="input" placeholder="Search messages" @change="fetchDebounce" />
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
            :class="['button', 'is-small', getFilterColor('servers', key)]"
            @click="toggleFilter('servers', key)"
          >
            {{ key }}
          </a>
        </div>
      </Field>
      <div class="columns">
        <div class="column is-4">
          <Field label="Around Id">
            <input v-model="filters.aroundId" type="number" class="input" min="0" placeholder="####" @change="fetchDebounce" />
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
            <template #hint_info>
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
import { ref, onBeforeMount, computed, onBeforeUnmount, onUnmounted, onMounted, onActivated, onDeactivated } from 'vue';
import { formatDate, getRelDate, request, requestTimeout } from '@/js/util';
import LogMessage from '@/components/LogMessage.vue';
import Field from '@/components/Field.vue';
import debounce from '@/js/debounce';
import { useRoute, useRouter } from 'vue-router';
//@ts-expect-error no types
import SimpleTypeahead from 'vue3-simple-typeahead';
import 'vue3-simple-typeahead/dist/vue3-simple-typeahead.css'
import InfiniteLoading from "v3-infinite-loading";
import { APILogData, APILogQueryResult } from '../../../../common-types/Logs';

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
let entries = ref<UILogEntry[]>()
/** The name of selected data source (partition server side), currently divided into full years.
  * We default to current year, as we expect there to be entries here
*/
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
interface UILogEntry {
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
let pendingEntries = ref<UILogEntry[]>([])
let infiniteScroll = ref()
let infiniteScrollLoading = ref<"top"|"bottom">()

let fetchAbort: AbortController | null = null
interface LogInfo extends APILogData {
  loading: boolean
}
let logInfo = ref<LogInfo>({ servers:[], years:{}, fullyLoaded: false, loading: true })
let firstLoad = false

const highlightRegex = computed(() => {
  return filters.value.message ? new RegExp(`(${filters.value.message})`, 'ig') : undefined
})
const loadingDuration = computed(() => {
  if(!loadingTime.value) return "0.0"
  return Math.max(((now.value - loadingTime.value) / 1000), 0).toFixed(1)
})
const dataSources = computed(() => {
  if(!logInfo.value?.years) return []
  // A cache value of null is provided for absolute totals, we ignore it
  // The list is also ascending, so just reverse it. Maybe in future order it just in case
  return Object.keys(logInfo.value.years)
    .sort((a,b) => Number(a) - Number(b)) // should already be sorted in ascending, but just in case
})

/**
 * Searches for a specific user, for search box typeaheads
 * @param event
 */
async function searchUsers(event: any) {
  if(!event.input || event.input.length < 3) return userSearchItems.value = []
  const response = await request(`/api/users/search/${event.input}`)
  if(response?.ok) {
    const json = await response.json()
    userSearchItems.value = json.users
  }
}
/** Returns display label for typeahead entries */
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
/** Move and merge pending entries onto the view */
function viewPendingEntries() {
  if(!entries.value) return
  entries.value = [...pendingEntries.value, ...entries.value.slice(0, -pendingEntries.value.length) ]
  pendingEntries.value = []
}
/** Toggle a filter on or off */
function toggleFilter(filter: string, key: string) {
  if(filters.value[filter] && Array.isArray(filters.value[filter])) {
    let v = filters.value[filter] as string[]
    let index = v.indexOf(key)
    console.log(key, index)
    if(index > -1) {
      v.splice(index, 1)
    } else {
      v.push(key)
    }
  }
  fetchDebounce()
}
/** Returns the color a filter should show */
function getFilterColor(filter: string, key: string) {
  if(!filters.value[filter] || !Array.isArray(filters.value[filter])) return
  const filterColor = FILTER_DATA[filter][key] ?? "is-info"
  const isEnabled = filters.value[filter].includes(key)
  // if(!filterColor) return
  return isEnabled ? [filterColor] : [filterColor,'is-outlined','is-light']
  // if(!filters.value[filter]!.includes(key)) return
  // return FILTER_DATA[filter][key] ?? "is-info"
}

/** Returns a new URLSearchParams with all fetch configurations */
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
  if(route.query.raw) searchParams.append("raw", "1")
  return searchParams
}
/** Updates the current url (in the browser address bar) to value from getParams() */
function updateParams() {
  const params = getParams()
  router.replace({ query: Object.fromEntries(params) })
  return params.toString()
}

/**
 * Returns log info for the specific year selected.
 * Will be null before getInfo() called, thus no data source selected
 */
const cache = computed({
  get() {
    return logInfo.value.years[dataSource.value]
  },
  set(newValue) {
    logInfo.value.years[dataSource.value] = newValue
  }
})

/**
 * Acquires log data (is server ready, the server names, and all the year data)
 * This initializes cache.value
 */
async function getInfo() {
  logInfo.value.loading = true
  const response = await request("/api/logs/data")
  if(response?.ok) {
    const json: APILogData = await response.json()
    logInfo.value.fullyLoaded = json.fullyLoaded
    logInfo.value.servers = json.servers
    logInfo.value.years = json.years
    logInfo.value.loading = false
  } else {
    logInfo.value.loading = false
    throw Error(response?.statusText)
  }
}

/** Performs a logs fetch but only ever 1200 ms  */
const fetchDebounce = debounce(search, 1200)
/**
 * When user clicks search icon, performs a search either around or normal before query
 * Calls fetchLogs with right parameters
 */
async function search() {
  if(!cache.value) return
  loadingTime.value = Date.now()
  showLoading.value = true
  if(filters.value.aroundId)
    entries.value = await fetchLogs(Number(filters.value.aroundId), "around")
  else
    entries.value = await fetchLogs(cache.value.maxId, "before")
  loadingTime.value = undefined
}

/**
 * Loads content (fetchLogs) from a certain side, either:
 * "top" - for new log entries since fetched
 * "bottom" - when user is scrolling down, get the next set
 * @param side
 */
async function loadContent(side: "top" | "bottom") {
  // Do not fire if loading, or if there is no content available
  if(infiniteScrollLoading.value || !entries.value || entries.value.length == 0 || loadingTime.value !== undefined) return
  let id, mode: "before"|"after"
  if(side == "top") {
    // Do not trigger on first load
    if(!firstLoad) {
      firstLoad = true
      return
    }
    // Do not load if already at top
    if(idMinMax.value[1] === cache.value?.maxId) return

    id = idMinMax.value[1] + 1
    mode = "after"
  } else if(side == "bottom") {
    id = idMinMax.value[0] - 1
    mode = "before"
  } else { throw new Error("invalid side")}

  infiniteScrollLoading.value = side
  const newEntries = await fetchLogs(id, mode)
  if(newEntries) {
    entries.value = [...entries.value, ...newEntries]
  }
  infiniteScrollLoading.value = undefined
  console.log('fetching content from', side)
}

/**
 * Fetches logs before, around, or after an id.
 *
 * Only one request can be in flight, previous request will be cancelled
 *
 * Request will time out after MAX_REQUEST_TIME (set to below cloudflare timeout)
 *
 * This should be called from search() or loadContent(side)
 * @param id
 * @param mode
 */
async function fetchLogs(id: number, mode: "before" | "after" | "around"): Promise<UILogEntry[]|undefined> {
  if(id == undefined) throw new Error("Id is undefined")
  // Cancel previous request if any
  loadingTime.value = Date.now()
  const params = updateParams()
  fetchAbort?.abort()

  // Setup cancellation and request timeout
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
    const json: APILogQueryResult = await response.json()
    if(json.yearInfo?.count) {
      totalEntries.value = json.yearInfo.count
      if(!cache.value) {
        console.warn("cache.value undefined, should not happen")
      } else {
        cache.value.maxId = json.yearInfo.maxId
      }
    }
    // Format log entries for UI purposes
    const newEntries = json.logs.map((entry: any) => {
      let message = entry.message
      if(entry.metadata && entry.message) {
        // Replace all variable placeholders %var% with keys from metadata json
        for(const key in entry.metadata) {
          message = message.replace(new RegExp(`(%${key}%|{${key}})`, 'g'), `<b data-tooltip="${key}">${entry.metadata[key]}</b>`)
        }
      }

      if(entry.type === 'JOIN') message = " joined" // join has no message, add one to it shows <PLAYER> joined
      else if(entry.type === 'ACTION') {
        // Check if entry is from admin chat, and switch it to chat
        const match = entry.message.match(ADMINCHAT_REGEX)
        if(match) {
          entry.adminChat = true
          entry.type = 'CHAT'
          message = match[2]
        }

      }
      if(entry.server === 'web' && entry.metata?.cmd && entry.type.startsWith("servers.rcon.")) {
        // If entry was performed from web, and was a 'say' command, log it as them chatting via rcon
        const match = entry.metadata.cmd.match(CONSOLE_SAY_REGEX)
        if(match) {
          entry.adminChat = true
          entry.via = 'rcon'
          entry.metadata._type = entry.type
          entry.type = 'CHAT'
          message = match[2]
        }
      }
      // 'client' and 'target' can be any arbitary string such as CONSOLE, or a bot name, so check if its a player
      const hasValidClient = entry.client?.startsWith("STEAM_")
      const hasValidTarget = entry.target?.startsWith("STEAM_")

      const ret: UILogEntry = {
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
        rawMessage: entry.message,
        showDetails: false
      }
      return ret
    })

    console.info('Fetch', mode, 'took', json.timeTaken, 'ms')
    loadingTime.value = undefined
    showLoading.value = false
    return newEntries
  }
}
/**
 * Returns if we are at the top list,
 * such that the highest ID of our fetched log entries is equal to the server's highest log entry id
 */
const isTopOfList = computed(() => {
  if(!cache.value) return
  // If our highest id is greater than the cached, its some bug - just act like its the latest
  return idMinMax.value[1] >= cache.value.maxId
})
/**
 * Returns an array of the lowest and highest id of current fetched log entries
 * @return {[number,number]} [lowestID, highestID]
 */
const idMinMax = computed(() => {
  if(!entries.value || entries.value.length === 0) return [-1, -1]
  let lowestId = -1, maxId = -1
  for(const row of entries.value) {
    if(row.id > maxId || maxId === -1) maxId = row.id
    else if(row.id < lowestId || lowestId === -1) lowestId = row.id
  }
  return [ lowestId, maxId ]
})
/**
 * Internal: Merges new entries into pending entries
 * @param entries new entries
 */
function addPendingEntries(entries: UILogEntry[]) {
  if(!entries) return
  pendingEntries.value = [ ...pendingEntries.value, ...entries]
}

/**
 * Jumps to a certain entry, and fetches logs around it
 * @param entry
 */
async function jumpTo(entry: any) {
  // Clear any set messages
  // We assign once to prevent any triggering of fetch before everything is set
  filters.value = {
    ...filters.value,
    aroundId: entry.id,
    message: null,
  }
  router.replace({
    name: "logs-audit",
    query: {
      ...route.query,
      aroundId: entry.id
    }
  })
  // await fetchLogs(entry.id, 'around')
  await search()
}
/**
 * Returns a share link to exact message ID
 * @param entry
 */
function getShareLink(entry: UILogEntry) {
  const params = getParams()
  params.set('aroundId', entry.id.toString())
  return `${location.protocol}//${window.location.host}${window.location.pathname}/${entry.id}`
}
/**
 * Returns a human readable timestamp in local date "at" local time
 * @param entry
 */
function getTimestamp(entry: UILogEntry) {
  const date = new Date(entry.timestamp * 1000)
  return `${date.toLocaleDateString('sv-SE')} at ${date.toLocaleTimeString()}`
}
/** Copy share link from getShareLink(entry) to clipboard */
async function copyShareLink(entry: any) {
  const link = getShareLink(entry)
  await window.navigator.clipboard.writeText(link)
  notify({
    type: "success",
    text: "Shareable link copied to clipboard"
  })
}

/** Checks filters and other query parameters and validates them */
function checkRouteParams() {
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
}

/**
 * Returns the closest available year to the current year
 * If current year unavailable, the closestt year (in lower first) is picked
 * @returns year to use or null if no years to pick from
 */
function getClosestYear(): number | null {
  const currentYear = new Date().getFullYear()
  if(dataSources.value.length === 0) return null
  if(dataSources.value.includes(currentYear.toString())) return currentYear

  let closest = Number(dataSources.value[0])
  for(const year of Object.keys(dataSource.value)) {
    if(Math.abs(currentYear - Number(year)) < Math.abs(currentYear - closest)) {
      closest = Number(year)
    }
  }

  return closest
}

let refreshTimer: any
let nowTimer: any
onActivated(async() => {
  // Required for showing how long a fetch is taking
  now.value = Date.now()
  nowTimer = setInterval(() => {
    now.value = Date.now()
  }, 100)

  // Acquire required log data
  showLoading.value = true
  await getInfo()
  const year = getClosestYear()
  // TODO: error screen if no data source
  if(!year) return console.error("fatal: no data sources loaded / found, nothing to load")
  dataSource.value = year
  if(!cache.value) return console.error("fatal: cache.value undefined, no data for current year, should not happen")

  // Process route parameters
  // If specified, fetch entries around id instead
  if(route.query.aroundId) {
    const id = Number(route.params.aroundId)
    filters.value['aroundId'] = id.toString()
    entries.value = await fetchLogs(id, "around")
  }

  checkRouteParams()

  // If we already jumped using ?aroundId, skip fetching entries
  if(!route.params.aroundId) entries.value = await fetchLogs(cache.value.maxId, "before")

  // Setup timer that performs periodic fetch for new entries
  refreshTimer = setInterval(async () => {
    // Only check for new values IF we not full, not searching, and at the top of list
    if(isTopOfList.value && fetchAbort == null && pendingEntries.value.length < limit.value) {
      const newEntries = await fetchLogs(cache.value.maxId, "after")
      if(newEntries) {
        // don't replace, append non duplicates
        addPendingEntries(newEntries)
      }
    }

  }, REFRESH_INTERVAL)
})

onDeactivated(() => {
  clearInterval(nowTimer)
  clearInterval(refreshTimer)
})
</script>

<style scoped>
.admin-chat {
  color: #f0e359
}
</style>
