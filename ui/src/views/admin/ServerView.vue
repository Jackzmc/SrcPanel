<template>
<div>
<div class="notification is-danger" v-if="error">
  <h4 class="title is-4 has-text-centered">Could not acquire server information</h4>
  <h4 class="subtitle is-4  has-text-centered">Server returned an error</h4>
  <p class="has-text-centered ">
    {{error}}
  </p>
</div>
<nav class="container mb-3" v-if="server">
  <div class="columns">
    <div class="column is-8">
      <router-link to="/admin/servers" class="button is-small">🠐 back to servers list</router-link><br><br>
      <div class="box">
      <h3 class="title is-3">
        {{server.info.name}}
        <div class="tags is-pulled-right inline">
          <span class="tag is-success  is-medium" v-if="status && status.online">Online</span>
          <span class="tag is-danger  is-medium" v-else-if="status && !status.online">Offline</span>
          <span class="tag  is-medium" v-else>Unknown</span>
          <span data-tooltip="Server ID" class="tag is-info  is-medium">{{server.info.id}}</span>
        </div>
      </h3>
      <h4 class="subtitle is-4">{{server.info.domain}}:{{server.info.port}}</h4>
      <div class="tags">
        <span v-for="tag in server.info.tags" :key="tag" class="tag is-dark">{{tag}}</span>
      </div>
      </div>
      <div class="tabs is-large">
        <ul>
          <li v-for="(data, id) in TABS" :key="id"  :class="{'is-active': tab === id}">
            <router-link
              :to="{params:{tab: id}}"
              v-if="(!data.flag || privUser.hasWebPerm(data.flag)) && (data.enabled == undefined || data.enabled())"
            >
              {{data.name}}
            </router-link>
          </li>
        </ul>
      </div>
      <div v-if="tab === 'overview'" class="box">
        <template v-if="status && status.online">
          <div class="columns">
            <div class="column">
              <h5 class="title is-5 is-underlined">Map</h5>
              <p :data-tooltip="status.data.map" v-html="formatMap(status.data.map)"></p>
            </div>
            <div class="column">
              <h5 class="title is-5 is-underlined">Gamemode</h5>
              <p :data-tooltip="status.data.gamemode">{{formatGamemode(status.data.gamemode)}}</p>
            </div>
          </div>
          <div class="columns">
            <div class="column">
              <h5 class="title is-5 is-underlined">Online Players ({{status.data.players.length}} / {{status.data.maxplayers}})</h5>
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
              <h5 class="title is-5 is-underlined">Uptime</h5>
              <p v-if="stats">{{ formatUptime(stats.uptime) }}</p>
              <em v-else>no information available</em>
            </div>
          </div>

          <br>
        </template>
        <div class="notification is-danger has-text-centered" v-else-if="status && !status.online">
          The server is offline or is unreachable.
        </div>
        <!-- <p v-else-if="status && !status.online" class="has-text-centered has-text-danger subtitle is-4">Server is offline or unreachable</p> -->
        <p class="has-text-centered subtitle is-4 my-6 has-text-danger" v-else-if="status && status.error">{{  status.error }}</p>
        <p class="has-text-centered subtitle is-4 my-6" v-else>Waiting for server status...</p>
        <br>
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
      <div v-else-if="tab === 'actions'" class="box">
        <div class="buttons">
          <template v-if="status?.online">
          <a @click="processAction(server, 'stop')" class="button is-dark">Request Restart</a>
          <a @click="processAction(server, 'unreserve')" class="button is-dark">Unreserve</a>
          <a @click="processAction(server, 'stop?force=1')" class="button is-warning">Force Restart</a>
          </template>
          <a v-if="server.info.tags.includes('systemd')" @click="processAction(server, 'start')" class="button is-success">Start Server</a>
        </div>
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
        <p v-else class="has-text-centered">Server has no activity logs setup</p>
      </div>
      <div v-else-if="tab === 'configs'" class="box">
        <h5 class="title is-5">Config Files</h5>
        <FolderBrower v-if="server.configs" @select="onCfgChosen" :paths="server.configs" />
        <p v-else>Server has no configs setup</p>
      </div>
    </div>
  </div>
</nav>
<br>
</div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { onBeforeMount, ref, computed } from 'vue'
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
const REFRESH_INTERVAL = 1000 * 60

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
  },
  actions: {
    name: "Actions"
  }
}

let starting = ref(false)
let server = ref()
let servers = ref()
let status = ref()
let stats = ref()
let activities = ref()
let cfg = ref<{
  selected?: string, raw?: string, json?: any, loading: boolean }
>({ loading: false })
let error = ref<string>()

const tab = computed(() => {
  return route.params.tab.length > 0 ? route.params.tab : "overview"
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
  await fetchServerInfo()
  await fetchServerStatus()
}
async function fetchServerInfo() {
  error.value = undefined
  const response = await fetch(`/api/servers/${route.params.id}`)
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
      series.value = [{
        name: "Player Joins",
        data: json.test.map((row: any) => {
          return { x: new Date(row.timestamp*1000), y: row.count }
        })
      }]
    } else {
      const msg = json.message ?? json.error ?? json
      error.value = msg
    }
  } catch(err: any) {
    error.value = `${response.statusText}: ${err.message}`
    throw err
  }
}
async function fetchServerStatus() {
  const response = await fetch(`/api/servers/${route.params.id}/status`)
  const json = await response.json()
  if(response.ok) {
    status.value = json.status
    stats.value = json.stats
    activities.value = json.recentActivities?.map((act: any) => parseLog(act))
  } else {
    status.value = { error: json.message }
  }
}
async function fetchServersCompact() {
  const response = await request(`/api/servers?compact=1`)
  if(response?.ok) {
    const json = await response.json()
    servers.value = json
  }
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
  const match = mapId.match(/c(\d{1,2})m(\d)_(.*)/)
  if(match && match.length == 4) {
    return `<p class="title is-6">${OfficialCampaignNames[Number(match[1]) - 1]}</p><p class="subtitle is-6">Chapter ${match[2]} "${match[3]}"</p>`
  }
  return mapId;
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

onBeforeMount(async() => {
  await fetchServerInfo()
  await fetchServerStatus()
  await fetchServersCompact()
  setInterval(fetchServerStatus, REFRESH_INTERVAL)
})
</script>

<style>
.config-string {
  color: #628503
}
</style>
