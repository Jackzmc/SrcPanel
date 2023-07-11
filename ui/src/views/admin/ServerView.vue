<template>
<div class="has-background-light pt-0">
<div class="container">
  <article class="message is-danger" v-if="error && !server">
    <div class="message-header">
      <p><Icon icon="fa-exclamation-triangle">An error occurred while fetching server information</Icon></p>
    </div>
    <div class="message-body">
      <p>{{ error }}</p>
      <br>
      <p><a class="button is-info" @click="init">Retry</a></p>
    </div>
  </article>
</div>
<nav class="container mb-3 is-fluid" v-if="server">
  <div class="columns">
    <div class="column is-8">
      <router-link to="/admin/servers" class="button is-small">🠐 back to servers list</router-link><br><br>
      <div class="box">
      <h3 class="title is-3">
        {{server.info.name}}
        <div class="tags is-pulled-right inline">
          <span class="tag is-success  is-medium" v-if="status && status.online">Online</span>
          <span class="tag is-danger  is-medium" v-else-if="status && !status.online">Offline</span>
          <span class="tag is-danger is-medium has-tooltip-danger no-border" v-else-if="error" data-tooltip="An error occurred while fetching the server's status"><Icon icon="fa-exclamation-triangle">Error</Icon></span>
          <span class="tag is-medium" v-else><Icon icon="fa-spinner" spin></Icon></span>
          <span data-tooltip="Server ID" class="tag is-info is-medium no-border">{{server.info.id}}</span>
        </div>
      </h3>
      <h4 class="subtitle is-4">
        {{server.info.domain}}:{{server.info.port}}
        <Icon icon="fa-copy" data-tooltip="Copy to clipboard" @click="copyAddress"></Icon>
      </h4>
      <div class="tags">
        <span v-for="tag in server.info.tags" :key="tag" class="tag is-dark">{{tag}}</span>
      </div>
      </div>
      <div class="tabs is-large">
        <ul>
          <li v-for="(data, id) in TABS" :key="id"  :class="{'is-active': tab === id}">
            <router-link
              :to="{params:{tab: id}}"
              v-if="(!data.flag || privUser.hasPermission('servers.configs.read')) && (data.enabled == undefined || data.enabled())"
            >
              {{data.name}}
            </router-link>
          </li>
        </ul>
      </div>
      <div v-if="tab === 'overview'" class="box">
        <template v-if="status && status.online">
          <span class="is-inline is-pulled-right no-border pr-4" data-tooltip="Time until next refresh" style="width:10px">
            <Icon icon="fa-spinner" spin v-if="nextRefreshCountdown == 0"></Icon>
            <span v-else>{{ nextRefreshCountdown }}s</span>
          </span>
          <!-- <div>
            <div class="tile is-ancestor">
              <div class="tile">
                <p class="title">Map</p>
                <p class="subtitle">
                  {{ getMapDisplay(status.data.map)?.name }}
                </p>
              </div>
            </div>
          </div> -->
          <div class="columns">
            <div class="column">
              <h5 class="title is-5 is-underlined"><span class="tag is-large is-info">Map</span></h5>
              <p :data-tooltip="status.data.map" v-html="formatMap(status.data.map)"></p>
            </div>
            <div class="column">
              <h5 class="title is-5 is-underlined"><span class="tag is-large is-info">Gamemode</span></h5>
              <p :data-tooltip="status.data.gamemode">{{formatGamemode(status.data.gamemode)}}</p>
            </div>
          </div>
          <div class="columns">
            <div class="column">
              <h5 class="title is-5 tags">
                <span class="tag is-large is-info">Online Players ({{status.data.players.length}} / {{status.data.maxplayers}})</span>
              </h5>
              <div class="content" v-if="status.data.players.length > 0">
                <ul>
                  <li v-for="player in status.data.players" :key="player">
                    {{player}}
                  </li>
                </ul>
              </div>
              <em class="my-2" v-else>no players are online</em>
            </div>
            <div class="column">
              <h5 class="title is-5 is-underlined"><span class="tag is-large is-info">Uptime</span></h5>
              <p v-if="stats">{{ formatUptime(stats.uptime) }}</p>
              <em v-else>no information available</em>
            </div>
          </div>

          <br>
        </template>
        <div class="notification is-danger has-text-centered" v-else-if="status && !status.online">
          The server is offline or is unreachable.
          <span class="is-inline is-pulled-right no-border" data-tooltip="Time until next refresh">
            <Icon icon="fa-spinner" spin v-if="nextRefreshCountdown == 0"></Icon>
            <span v-else>{{ nextRefreshCountdown }}s</span>
          </span>
        </div>
        <!-- <p v-else-if="status && !status.online" class="has-text-centered has-text-danger subtitle is-4">Server is offline or unreachable</p> -->
        <p class="has-text-centered subtitle is-4 my-6 has-text-danger" v-else-if="status && status.error">{{  status.error }}</p>
        <!-- <div class="notification is-danger has-text-centered" v-else-if="error">
          An error occurred while
        </div> -->
        <article class="message is-danger" v-else-if="error">
          <div class="message-header">
            <p><Icon icon="fa-exclamation-triangle">An error occurred while fetching server information</Icon></p>
          </div>
          <div class="message-body">
            {{ error }}
          </div>
        </article>
        <p class="has-text-centered subtitle is-4 my-6" v-else><Icon icon="fa-spinner" spin>Waiting for server status...</Icon></p>
        <VueApexCharts :series='series' :options="options" type="line" />
        <VueApexCharts :series='series2' :options="options2" type="line" />

      </div>
      <div v-else-if="tab === 'configs'" class="box">
        <p class="has-text-centered my-6 is-size-5" v-if="cfg.loading">Loading...</p>
        <template v-if="cfg.selected">
          <pre v-if="cfg.json" class="box" spellcheck="false"><template v-for="entry in cfg.json" :key="entry.command"><span class="has-text-dark">{{entry.cvar ?? entry.command}}</span> <span :class="{'config-string': entry.type === 'string', 'has-text-info': entry.type === 'number'}">{{entry.value}}</span><br></template></pre>
          <pre class="box" v-if="cfg.raw">
            {{ cfg.raw }}
          </pre>
        </template>
        <p class="has-text-centered subtitle is-5 my-6" v-else>Select a config file on the right to view its content</p>
      </div>
    </div>

    <div class="column">
      <div class="field">
        <label class="label">View another server:&nbsp;</label>
        <div class="select">
          <select @change="onSelectNewServer">
            <option default v-if="!servers">Loading servers...</option>
            <option v-for="server2 in servers" :key="server2.id" :value="server2.id" :selected="server2.id == server.info.id">
              {{server2.name}}
            </option>
          </select>
        </div>
      </div>
      <div class="box">
        <h4 class="title is-5">Actions</h4>
        <div class="buttons">
          <template v-if="status?.online">
          <a @click="processAction(server, 'stop')" class="button is-dark">Request Restart</a>
          <a @click="processAction(server, 'stop?force=1')" class="button is-warning">Force Restart</a>
          <a @click="processAction(server, 'unreserve')" class="button is-dark">Unreserve</a>
          </template>
          <a v-if="server.info.tags.includes('systemd')" @click="processAction(server, 'start')" class="button is-success">Start Server</a>
        </div>
        <p v-if="!status?.online && !server.info.tags.includes('systemd')"><em>no actions available</em></p>
      </div>
      <div class="box" v-if="tab === 'overview'">
        <h4 class="title is-5">Recent Activity</h4>
        <table v-if="activities" class="table">
          <thead>
            <tr>
              <th>Message</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="activity in activities" :key="activity.id">
              <LogMessage :log="activity" :userdata="userdata" />
              <td>{{ new Date(activity.timestampRaw * 1000).toLocaleTimeString()}}</td>
            </tr>
          </tbody>
        </table>
        <p v-else><em>not supported on server</em></p>
      </div>
      <div v-else-if="tab === 'configs'" class="box">
        <h5 class="title is-5">Config Files</h5>
        <FolderBrower v-if="server.configs" @select="onCfgChosen" :paths="server.configs" />
        <em v-else>not supported on server</em>
      </div>
    </div>
  </div>
</nav>
<br>
</div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { onBeforeMount, ref, computed, onUnmounted } from 'vue'
import FolderBrower from'@/components/FolderBrowser.vue'
import { UserData, WebPermission } from '../../../../common-types/User';
import { PrivilegedUser } from '@/js/User';
import { parseLog, getRelDate, request } from '@/js/util';
import LogMessage from "@/components/LogMessage.vue";
import { useNotification } from "@kyvg/vue3-notification";
import VueApexCharts from 'vue3-apexcharts'

let series = ref<any[]>([])
let series2 = ref<any[]>([])
const options = {
  chart: {
    zoom: {
      enabled: true,
      type: 'x',
      autoScaleYaxis: true
    },

  },
  title: {
    text: "Player Joins",
    align: 'left'
  },
  yaxis: {
    type: "numeric",
    title: "Joins"
  },
  xaxis: {
    type: "datetime",
    datetimeUTC: false
  }
}
const options2 = {
  chart: {
    zoom: {
      enabled: true,
      type: 'x',
      autoScaleYaxis: true
    },

  },
  title: {
    text: "Online Players",
    align: 'left'
  },
  yaxis: {
    type: "numeric",
    title: "Players",
    labels: {
      formatter: function (val: any) {
        return val.toFixed(0);
      }
    },
  },
  stroke: {
    curve: 'stepline',
  },
  xaxis: {
    type: "datetime",
    datetimeUTC: false
  }
}
const REFRESH_INTERVAL = 1000 * 10

const { notify } = useNotification();
const props = defineProps<{
  userdata: UserData
}>()
const privUser = new PrivilegedUser(props.userdata)

const route = useRoute()
const router = useRouter()

const TABS: Record<string, { name: string, flag?: WebPermission, enabled?: Function }> = {
  overview: {
    name: "Overview",
  },
  configs: {
    name: "Configs",
    flag: WebPermission.ConfigRead,
    enabled: () => {
      return server.value && server.value.configs
    }
  }
}

let starting = ref(false)
let lastRefreshTime = ref()
let server = ref()
let servers = ref()
let status = ref()
let stats = ref()
let activities = ref()
let cfg = ref<{
  selected?: string, raw?: string, json?: any, loading: boolean }
>({ loading: false })
let error = ref<string>()
let now = ref(Date.now())


const tab = computed(() => {
  return route.params.tab.length > 0 ? route.params.tab : "overview"
})

const nextRefreshCountdown = computed(() => {
  return Math.max(Math.floor(((lastRefreshTime.value + REFRESH_INTERVAL) - now.value) / 1000), 0)
})

async function onCfgChosen(data: { file: string, folder?: string }, raw = false) {
  cfg.value.selected = data.folder ? `${data.folder}/${data.file}` : data.file
  cfg.value.loading = true
  const response = await fetch(`/api/servers/${route.params.id}/configs?path=${cfg.value.selected}${raw?'&raw=1':''}`)
  cfg.value.loading = false
  if(response.ok) {
    cfg.value.json = undefined
    cfg.value.raw = undefined
    if(raw)
      cfg.value.raw = await response.text()
    else
      cfg.value.json = await response.json()
  }
}

async function onSelectNewServer(event: any) {
  await router.push({ name: 'admin-server-view', params: { tab: 'overview', id: event.target.value }})
  server.value = undefined
  init()
}
async function fetchServerInfo() {
  error.value = undefined
  const id = route.params.id
  const response = await fetch(`/api/servers/${route.params.id}`)
  if(id != route.params.id) return // Ignore changes in id
  try {
    const json = await response.json()
    if(response.ok) {
      server.value = json
      series2.value = [{
        name: "Players",
        data: json.playerCounts.map((count: any) => {
          return { x: new Date(count.timestamp*1000), y: count.count }
        })
      }]
      if(json.playerJoins) {
        series.value = [{
          name: "Player Joins",
          data: json.playerJoins.map((row: any) => {
            return { x: new Date(row.timestamp*1000), y: row.count }
          })
        }]
      }
      return true
    } else {
      error.value = json.message ?? json.err ?? json ?? await response.text()
      return false
    }
  } catch(err: any) {
    console.error(err)
    error.value = `${response.status} ${response.statusText}: ${err.message}`
    return false
  }
}
async function fetchServerStatus() {
  const id = route.params.id
  const response = await fetch(`/api/servers/${route.params.id}/status`)
  if(id != route.params.id) return // Ignore changes in id
  lastRefreshTime.value = Date.now()
  const json = await response.json()
  if(response.ok) {
    status.value = json.status
    stats.value = json.stats
    activities.value = json.recentActivities?.map((act: any) => parseLog(act))
  } else {
    status.value = { error: json.message }
  }
}
const SERVER_CACHE_EXP_TIME = 1000 * 60 * 60 * 24 // 1 day
async function fetchServersCompact() {
  let cachedServers: any = window.localStorage?.getItem("srcds_servers")
  if(cachedServers) cachedServers = JSON.parse(cachedServers)

  if(!cachedServers || Date.now() - cachedServers.timestamp > SERVER_CACHE_EXP_TIME) {
    const response = await request(`/api/servers?compact=1`)
    if(response?.ok) {
      const json = await response.json()
      cachedServers = {
        timestamp: Date.now(),
        data: json
      }
      window.localStorage.setItem("srcds_servers", JSON.stringify(cachedServers))
    }
  }
  servers.value = cachedServers.data
}

function processAction(server: any, type: string) {
  if(type === "start") {
    starting.value = true
    setTimeout(() => {
      starting.value = false
    }, 1000 * 30)
  }
  fetch(`/api/servers/${server.id}/${type}`, {
    method: 'POST',
    credentials: 'include'
  })
  .then(async(response) => {
    if(response.ok ) {
      const json = await response.json()
      if(json.error) {
        return notify({ type: 'error', text: `<b>Server returned error</b><br>${json.message}` })
      }
      if(json.response.includes("players online")) {
        notify({ type: 'error', text: 'Cannot restart server: There are players online'})
      }else{
        notify({ type: 'sucess', text: json.response})
      }
    }else{
      notify({ type: 'error', text: `<b>Server returned error</b><br>${response.statusText}`})
    }
  })
  .catch(err => {
    notify({ type: 'error', text: `${err.message}`})
  })
}

function formatMap(mapId: string) {
  const display = getMapDisplay(mapId)
  return display ? `<p class="title is-6">${display.name}</p><p class="subtitle is-6">Chapter ${display.chapterId} "${display.chapterName}"</p>` : mapId
}
function getMapDisplay(mapId: string) {
  const match = mapId.match(/c(\d{1,2})m(\d)_(.*)/)
  if(match && match.length == 4) {
    return {
      name: OfficialCampaignNames[Number(match[1]) - 1],
      chapterId: match[2],
      chapterName: match[3]
    }
  }
  return null;
}

function formatGamemode(gamemode: string) {
  let output = Gamemodes[gamemode];
  if(!output) {
    output = output.charAt(0).toUpperCase() + output.slice(1)
  }
  return output
}
function formatUptime(minutes: number) {
  const hours = Math.round(minutes / 60)
  if(hours < 1) return `${minutes} minutes`
  const days = Math.round(hours / 24)
  if(days < 1) return `${hours} hours`
  return `${days} days`
}

async function copyAddress() {
  await navigator.clipboard.writeText(`connect ${server.value.info.domain}:${server.value.info.port}`)
  notify({
    type: "success",
    text: "Copied to clipboard"
  })
}

const Gamemodes: Record<string, string> = {
  "coop": "Campaign",
}

const OfficialCampaignNames = [
  "Dead Center",
  "Dark Carnival",
  "Swamp Fever",
  "Hard Rain",
  "The Parish",
  "The Passing",
  "The Sacrifice",
  "No Mercy",
  "Crash Course",
  "Death Toll",
  "Dead Air",
  "Blood Harvest",
  "Cold Stream",
  "The Last Stand"
]

let refreshInterval: any = 0
async function init() {
  status.value = undefined
  error.value = undefined
  clearInterval(refreshInterval)
  if(await fetchServerInfo()) {
    await fetchServerStatus()
    refreshInterval = setInterval(fetchServerStatus, REFRESH_INTERVAL)
  }
}

setInterval(() => {
  now.value = Date.now()
}, 1000)

onBeforeMount(async() => {
  await fetchServersCompact()
  await init()
})
onUnmounted(() => {
  clearInterval(refreshInterval)
})
</script>

<style>
.config-string {
  color: #628503
}
</style>
