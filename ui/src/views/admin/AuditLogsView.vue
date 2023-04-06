<template>
<div class="container is-fluid">
  <article class="message is-warning">
    <div class="message-body content">
      <b>Feature in development</b><br>
      Feature may have some bugs, in the meantime, you can still use the <router-link :to="{name: 'logs-activity' }">Activity Logs</router-link>.
    </div>
  </article>
  <h4 class="title is-4">
    Showing <input type="number" class="input" min=20 max=1000 step=10 style="width:5%" v-model="limit" @blur="fetchLogs" /> / {{ totalEntries.toLocaleString() }} Entries
    <!-- <em class="subtitle is-4" v-if="hasSearchQuery">({{ notesCount }} filtered)</em> -->
    <div class="is-pulled-right">
      <p class="is-inline mr-3 is-size-6" v-if="nextRefreshCountdown" data-tooltip="Time until the next auto refresh">{{ nextRefreshCountdown }}s</p>
      <a :class="['button','is-info',{'is-loading': loadingTime}]" @click="fetchLogs"><Icon icon="sync">Refresh</Icon></a>
    </div>
  </h4>
  <p class="subtitle is-6">Some requests may take a long time to process such as searching users or message content</p>
  <Pagination :page="page" :count="totalEntries" :limit="limit" @page="setPage" />
  <div class="columns">
    <div class="column is-8 box" v-if="!entries">
      <p class="has-text-centered is-size-5" style="margin-top:20%">
        <Icon icon="spinner" spin>Loading...</Icon>
        <br>
        {{ loadingDuration }}s
      </p>
    </div>
    <div class="column is-8 box" v-else>
      <p class="has-text-centered is-size-5" v-if="entries.length === 0" style="margin-top:10%">No entries were found</p>
      <div class="list has-visible-pointer-controls has-hoverable-list-items" v-else>
        <template v-for="entry in entries" :key="entry.id">
          <div class="list-item" @mouseenter="hoverId = entry.id">
            <div class="list-item-image" v-if="entry.client.avatarUrl || entry.target.avatarUrl">
              <figure class="image is-48x48">
                <img class="is-rounded" :src="entry.client.avatarUrl || entry.target.avatarUrl">
              </figure>
            </div>

            <div class="list-item-content">
              <div class="list-item-title">
                {{ formatDate(entry.timestamp) }}
                <span class="ml-2 has-text-grey-light is-inline subtitle is-6">{{ getRelDate(entry.timestamp) }}</span>
                <span class="tags is-pulled-right">
                  <span v-if="entry.adminChat" class="tag is-pulled-right is-warning" data-tooltip="Message was sent in the admin chat">CHAT</span>
                  <span v-else :class="['tag', 'is-pulled-right', FILTER_DATA.types[entry.type]]">{{ entry.type }}</span>
                  <span :class="['tag', 'is-pulled-right', FILTER_DATA.servers[entry.server]]">{{ entry.server }}</span>
                </span>
              </div>
              <div class="list-item-description">
                <!-- <UserComponent :user="entry.client" is-admin />
                {{entry.message}}
                <span v-html='entry._html' />
                <UserComponent v-if="entry.target" :user="entry.target"/>
                {{ entry._message2 }} -->
                <LogMessage :log="entry" :priv-user="privUser" :hover-id="hoverId" :highlight-regex="highlightRegex" />
                </div>
            </div>

            <div class="list-item-controls">
              <div class="buttons is-right">
                <!-- <button :class="['button', {'is-info': entry.showDetails, 'is-outlined': entry.showDetails }]">
                  <span @click="entry.showDetails = !entry.showDetails">Details</span>
                </button> -->
                <button class="button is-inverted is-outlined is-black" @click="entry.showDetails = !entry.showDetails">
                  <Icon icon-class="is-small has-text-black" :icon="entry.showDetails ? 'fa-chevron-up' : 'fa-chevron-down'" />
                </button>
              </div>
            </div>
          </div>
          <div class="list-item  px-0 mx-0 my-0 py-0" v-if="entry.showDetails">

            <div class="list-item-content">
              <div class="notification is-dark">
                <p><b>Id:</b> #{{ entry.id }}<a class="ml-2" @click="filters.aroundId = entry.id">(find entries nearby)</a></p>
                <p><b>Client ID: </b><span v-if="entry.client.steamid">{{ entry.client.steamid }}</span><em v-else>none</em></p>
                <p><b>Target ID: </b><span v-if="entry.target.steamid">{{ entry.target.steamid }}</span><em v-else>none</em></p>
                <p><b>Raw Message: </b>{{ entry.message }}</p>
                <template v-if="entry.metadata">
                  <p><b>Metadata: </b></p>
                  <pre class="px-1 py-1 box"><code>{{ JSON.stringify(entry.metadata, null, 2) }}</code></pre>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div class="column">
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
          <a class="is-inline" @click="filters.types = []; getParams()">(Clear)</a>&nbsp;
          <a @click="filters.types = Object.keys(FILTER_DATA.types)">(Select All)</a>
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
          <a class="is-inline" @click="filters.servers = []">(Clear)</a>&nbsp;
          <a @click="filters.servers = Object.keys(FILTER_DATA.servers)">(Select All)</a>
        </label>
        <div class="buttons has-addons">
          <a
            v-for="(val, key) of FILTER_DATA.servers" :key="key"
            :class="['button', 'is-small',  getFilterColor('servers', key)]"
            @click="toggleFilter('servers', key)"
          >
            {{ key }}
          </a>
        </div>
      </Field>
      <Field label="Around Id">
        <input v-model="filters.aroundId" type="number" class="input" min="0" style="width:30%" @change="fetchDebounce" placeholder="########" />
      </Field>
    </div>
  </div>
  <Pagination :page="page" :count="totalEntries" :limit="limit" @page="setPage" />
  <br>
</div>
</template>


<script setup lang="ts">
import { UserData } from '../../../../common-types/User.js';
import { useNotification } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User';
import { ref, onBeforeMount, computed } from 'vue';
import { formatDate, getRelDate, request } from '@/js/util';
import LogMessage from '@/components/LogMessage.vue';
import Field from '@/components/Field.vue';
import Pagination from '@/components/Pagination.vue';
import debounce from '@/js/debounce';
import { useRoute, useRouter } from 'vue-router';
//@ts-ignore
import SimpleTypeahead from 'vue3-simple-typeahead';
import 'vue3-simple-typeahead/dist/vue3-simple-typeahead.css'
let userSearchItems = ref([])
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
  fetchDebounce.value()
}
function onUserSearchBlur(filter: string, event: any) {
  console.log('blur', event.input.length, filter)
  if(event.input.length < 3) {
    filters.value[filter] = null
    fetchDebounce.value()
  }
}

const route = useRoute()
const router = useRouter()
const { notify } = useNotification();

const REFRESH_INTERVAL = 60_000

const DEFAULT_TYPES = ["ACTION", "CHAT", "INFO", "STATE", "QUIT", "JOIN"];
const DEFAULT_SERVERS = ["main", "reserved"];
const DEFAULT_LIMIT = 30

const FILTER_DATA: Record<string, Record<string, boolean | string>> = {
  servers: {
    web: "is-info",
    main: "is-success",
    reserved: "is-dark",
    public1: true,
    public2: true,
    public3: true,
    public4: true,
    public5: true,
    public6: true,
    public7: true,
    public8: true,
    unknown: true,
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


const props = defineProps<{
  userdata: UserData,
  privUser: PrivilegedUser
}>();

let now = ref()
let loadingTime = ref<number>()
let lastRefresh = ref<number>()
let hoverId = ref()
let page = ref(1);
let limit = ref(DEFAULT_LIMIT);
let totalEntries = ref(0)
let entries = ref()
let fetchDebounce = ref()
let filters = ref<Record<string, string|string[]|null>>({
  servers: DEFAULT_SERVERS,
  types: DEFAULT_TYPES,
  client: null,
  target: null,
  aroundId: null
});

const ADMINCHAT_REGEX = /triggered sm_say \(text (.*)\)/;

const highlightRegex = computed(() => {
  return filters.value.message ? new RegExp(`(${filters.value.message})`, 'ig') : undefined
})
const loadingDuration = computed(() => {
  if(!loadingTime.value) return
  return Math.floor((now.value - loadingTime.value) / 1000)
})
const nextRefreshCountdown = computed(() => {
  if(!lastRefresh.value || loadingTime.value != undefined) return 0
  return Math.floor(((lastRefresh.value + REFRESH_INTERVAL) - now.value) / 1000)
})

function toggleFilter(filter: string, key: string) {
  if(filters.value[filter] && Array.isArray(filters.value[filter])) {
    let v = filters.value[filter] as string[]
    let index = v.indexOf(key)
    if(index > -1)
      v.splice(index, 1)
    else
      v.push(key)
  }
  fetchDebounce.value()
}
function getFilterColor(filter: string, key: string) {
  if(!filters.value[filter] || !Array.isArray(filters.value[filter])) return
  if(!filters.value[filter]!.includes(key)) return
  return FILTER_DATA[filter][key] !== true ? FILTER_DATA[filter][key] : undefined
}

function getParams() {
  if(!entries.value) return
  const searchParams = new URLSearchParams()
  searchParams.append('page', page.value.toString())
  searchParams.append('limit', limit.value.toString())
  for(const [filter, val] of Object.entries(filters.value)) {
    if(!val) continue
    if(Array.isArray(val)) {
      searchParams.append(filter, val.join(","))
    } else {
      searchParams.append(`search_${filter}`, val)
    }
  }
  router.replace({ query: Object.fromEntries(searchParams) })
  return searchParams.toString()
}

async function fetchLogs() {
  // Wait for previous request
  if(loadingTime.value != undefined) return
  loadingTime.value = Date.now()
  const response = await request(`/api/logs/?${getParams()}`)
  if(response?.ok) {
    const json = await response.json()
    totalEntries.value = json.totalCount
    entries.value = json.logs.map((entry: any) => {
      if(entry.metadata && entry.message) {
        for(const key in entry.metadata) {
          entry.message = entry.message.replace(new RegExp(`%${key}%`, 'g'), `<b data-tooltip="${key}">${entry.metadata[key]}</b>`)
        }
      }
      if(entry.type === 'JOIN') entry.message = " joined"
      if(entry.type === 'ACTION') {
        const match = entry.message.match(ADMINCHAT_REGEX)
        if(match) {
          entry.adminChat = true
          entry.type = 'CHAT'
          entry.message = "<span style='color:#dcac36'>" + match[1] + "</span>"
        }
      }
      return {
        id: entry.id,
        timestamp: entry.timestamp,
        server: entry.server,
        type: entry.type,
        adminChat: entry.adminChat,
        client: {
          steamid: entry.client,
          name: entry.clientName,
          avatarUrl: entry.clientName ? (entry.clientAvatar ? `https://avatars.steamstatic.com/${entry.clientAvatar}.jpg` : `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.clientName || entry.client)}`) : null
        },
        target: {
          steamid: entry.target,
          name: entry.targetName,
          avatarUrl: entry.targetName ? (entry.targetAvatar ? `https://avatars.steamstatic.com/${entry.targetAvatar}.jpg` : `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.targetName || entry.target)}`) : null
        },
        metadata: entry.metadata,
        message: entry.message
      }
    })
    console.info('Fetch took', json.timeTaken, 'ms')
    loadingTime.value = undefined
    lastRefresh.value = Date.now()
  } else {
    loadingTime.value = undefined
  }
}
function setPage(pageNum: number) {
  page.value = pageNum;
  fetchLogs();
}

onBeforeMount(() => {
  setInterval(() => {
    fetchLogs()
  }, REFRESH_INTERVAL)

  fetchDebounce.value = debounce(fetchLogs, 500)


  if(route.query.limit) limit.value = Number(route.query.limit) || DEFAULT_LIMIT
  if(route.query.page) page.value = Number(route.query.page) || 1
  if(page.value <= 0) page.value = 1
  for(const filter in FILTER_DATA) {
    let queryName = filter
    console.log('filter', filter, queryName, '=', route.query[queryName])
    // Some query are prefixed with search_, so we check them:
    if(route.query[queryName] === undefined) queryName = `search_${queryName}`
    if(route.query[queryName] !== undefined) {
      if(Array.isArray(filters.value[filter])) {
        if(route.query[queryName] === "") filters.value[filter] = []
        else filters.value[filter] = (route.query[queryName] as string).split(/,+/g)
      } else {
        console.log('setting', filter, (route.query[queryName] as string))
        filters.value[filter] = route.query[queryName] as string
      }
    }
  }

  now.value = Date.now()
  setInterval(() => {
    now.value = Date.now()
  }, 1000)

  fetchLogs()
})

</script>

<style src="../../../node_modules/bulma-list/css/bulma-list.css" />
