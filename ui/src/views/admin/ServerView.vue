<template>
<nav class="container" v-if="server">
  <div class="columns">
    <div class="column is-8">
      <router-link to="/admin/servers" class="button is-small">🠐 back to servers</router-link>
      <h3 class="title is-3">
        {{server.info.name}}
        <span class="tag is-pulled-right inline is-info">{{server.info.id}}</span>
      </h3>
      <h4 class="subtitle is-4">{{server.info.domain}}:{{server.info.port}}</h4>
      <div class="tags">
        <span v-for="tag in server.info.tags" :key="tag" class="tag is-dark">{{tag}}</span>
      </div>
      <div class="tabs">
        <ul>
          <li v-for="(data, id) in TABS" :key="id" :class="tabClass(id)">
            <a v-if="!data.flag || privUser.hasWebPerm(data.flag)" @click="setTab(id)">{{data.name}}</a>
          </li>
        </ul>
      </div>
      <template v-if="tab == 'overview'">
        <template v-if="status && status.online">
          <div class="columns">
            <div class="column">
              <h5 class="title is-5">Map</h5>
              <p>{{status.data.map}}</p>
            </div>
            <div class="column">
              <h5 class="title is-5">Gamemode</h5>
              <p>{{status.data.gamemode}}</p>
            </div>
          </div>
          <h5 class="title is-5">Online Players ({{status.data.players.length}} / {{status.data.maxplayers}})</h5>
          <template>
            <div class="content"  v-if="status.data.players.length > 0">
              <ul>
                <li v-for="player in status.data.players" :key="player">
                  {{player}}
                </li>
              </ul>
            </div>
            <p class="my-2" v-else>No players are online</p>
          <br>
          </template>
        </template>
        <p v-else-if="status && !status.online" class="has-text-centered has-text-danger subtitle is-4">Server is offline or unreachable</p>
        <p class="has-text-centered subtitle is-4" v-else>Waiting for server status...</p>
        <br>
      </template>
      <template v-else-if="tab == 'configs'">
        <ul v-if="cfg.selected">
          <li v-for="entry in cfg.json" :key="entry.command">
            <b>{{entry.command}}</b>
            {{entry.value}}
          </li>
        </ul>
        <p class="has-text-centered subtitle is-4" v-else>Select a config file on the right to view</p>
      </template>
    </div>

    <div class="column">
      <div class="field" v-if="servers">
        <label class="label">View another server:&nbsp;</label>
        <div class="select">
          <select @change="onSelectNewServer">
            <option v-for="server2 in servers" :key="server2.id" :value="server2.id" :selected="server2.id == server.info.id">
              {{server2.name}}
            </option>
          </select>
        </div>
      </div>
      <p class="my-2" v-else>Fetching servers...</p>
      <template v-if="tab === 'overview'">
        <h4 class="title is-4">Recent Activity</h4>
        <table v-if="activities" class="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Message</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="activity in activities" :key="activity.id">
              <td>{{activity.type}}</td>
              <td>{{activity.message}}</td>
              <td>{{ new Date(activity.timestamp * 1000).toLocaleDateString()}}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="has-text-centered">Server has no activity logs setup</p>
      </template>
      <template v-else-if="tab === 'configs'">
        <h5 class="title is-5">Config Files</h5>
        <FolderBrower @select="onCfgChosen" :paths="server.configs" />
      </template>
    </div>
  </div>
</nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { onBeforeMount, ref } from 'vue'
import FolderBrower from'@/components/FolderBrowser.vue'
import { Session, WebPermission } from '../../../../common-types/User';
import { PrivilegedUser } from '@/js/User';

const REFRESH_INTERVAL = 1000 * 60

const props = defineProps<{
  userdata: Session
}>()
const privUser = new PrivilegedUser(props.userdata)

const route = useRoute()
const router = useRouter()

const TABS: Record<string, { name: string, flag?: WebPermission }> = {
  overview: {
    name: "Overview",
  },
  configs: {
    name: "Configs",
    flag: WebPermission.ConfigRead
  },
  activity: {
    name: "Activity Log"
  }
}

let server = ref()
let servers = ref()
let status = ref()
let activities = ref()
let tab = ref("overview")
let cfg = ref<{
  selected?: string, raw?: string, json?: any}
>({})

function setTab(name: string) {
  tab.value = name
}
function tabClass(name: string) {
  return tab.value == name ? 'is-active' : ''
}

async function onCfgChosen(data: { file: string, folder?: string }, raw = false) {
  cfg.value.selected = data.folder ? `${data.folder}/${data.file}` : data.file
  const response = await fetch(`/api/servers/${route.params.id}/configs?path=${cfg.value.selected}${raw?'&raw=1':''}`)
  if(response.ok) {
    if(raw)
      cfg.value.raw = await response.text()
    else
      cfg.value.json = await response.json()
  }
}

async function onSelectNewServer(event: any) {
  await router.push(`/admin/servers/${event.target.value}`)
  server.value = undefined
  await fetchServerInfo()
  await fetchServerStatus()
}
async function fetchServerInfo() {
  const response = await fetch(`/api/servers/${route.params.id}`)
  if(response.ok) {
    server.value = await response.json()
  }
}
async function fetchServerStatus() {
  const response = await fetch(`/api/servers/${route.params.id}/status`)
  if(response.ok) {
    const json = await response.json()
    status.value = json.status
    activities.value = json.recentActivities
  }
}
async function fetchServersCompact() {
  const response = await fetch(`/api/servers?compact=1`)
  if(response.ok) {
    const json = await response.json()
    servers.value = json
  }
}
onBeforeMount(async() => {
  await fetchServerInfo()
  await fetchServerStatus()
  await fetchServersCompact()
  setInterval(fetchServerStatus, REFRESH_INTERVAL)
})


</script>
