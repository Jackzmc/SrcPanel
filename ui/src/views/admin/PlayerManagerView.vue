<template>
<div>
  <router-view :priv-user="privUser" />
  <div class="container">
    <Tabs inner-wrapper-class="tabs is-large" :dummy="Date.now()" @changed="setTab">
      <Tab id="recent" name="Recently Played With">
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              Recently Played From
            </p>
          </header>
          <div class="card-content">
            <div class="level">
              <div class="level-left">
                <div class="level-item">
                  <div class="field is-horizontal">
                    <div class="field-label is-normal">
                      <label class="label">Server</label>
                    </div>
                    <div class="field-body">
                      <div class="field is-narrow">
                        <div class="control">
                          <div class="select">
                            <select v-model="recentPlayers.server" @change="getRecentPlayers()">
                              <option :value="null">All Servers</option>
                              <option v-for="server in servers" :key="server" :value="server">
                                {{ server }}
                              </option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="level-item">
                  <a :class="['button','is-info',{'is-loading': recentPlayers.loading}]" @click="getRecentPlayers()">Refresh</a>
                </div>
              </div>
              <div class="level-right">
                <div class="level-item">
                  Auto refreshing every 60s
                </div>
              </div>
            </div>
          </div>
        </div>
        <br>
        <UserSelection :priv-user="privUser" :users="recentPlayers.list" @manual="onManualSelected" />
        <button :class="['button',{'is-loading': recentPlayers.loading}]" @click="getRecentPlayers(recentPlayers.currentOffset)">Load more entries</button>
      </Tab>
      <Tab id="search" name="Search for a User">
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              Search for a player (SteamID2 or name)
            </p>
          </header>
          <div class="card-content">
            <input v-model="search.query" class="input" type="text" placeholder="STEAM_1:1:####### or a name" style="width:30%" @input="search.func">
          </div>
        </div>
        <br>
        <UserSelection has-manual :priv-user="privUser" :users="users" @manual="onManualSelected" />
        <p v-if="!search.query" class="has-text-centered my-6 is-size-5">Enter a search query</p>
        <p v-else-if="users.length === 0" class="has-text-centered my-6 is-size-5">No players found</p>
      </Tab>
      <Tab v-if="privUser.hasPermission('admins.view')" id="admins" name="Admins" @selected="fetchAdmins">
      <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              Search for a player (SteamID2 or name)
            </p>
          </header>
          <div class="card-content">
            <input v-model="search.query" class="input" type="text" placeholder="STEAM_1:1:####### or a name" style="width:30%" @input="search.func">
          </div>
        </div>
        <br>
        <div class="columns is-multiline">
          <SplitTable v-slot="slotProps" :items-per-column="10" :data="filteredAdmins">
            <div class="column is-4">
              <table class="table is-bordered is-fullwidth">
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Name</th>
                    <th>SteamID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="admin in slotProps.data" :key="admin.id">
                    <td>{{ admin.id }}</td>
                    <td>
                      <router-link :to="{name:'manage-user',params:{id:admin.steamid},query:{returnTo:$route.fullPath}}">
                        {{ admin.name }}
                      </router-link>
                    </td>
                    <td>{{ admin.steamid }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SplitTable>
        </div>
      </Tab>
    </Tabs>
    <br>
  </div>
  <br><br>
</div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, computed, onMounted, onActivated } from 'vue';
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { ReadableAdminData } from '../../../../common-types/User';
import UserSelection from '@/components/UserSelection.vue'
// @ts-expect-error no @types
import {Tabs, Tab} from 'vue3-tabs-component';
// Keep track and open gui for each ban
import Debounce from '@/js/debounce'
import { request } from '@/js/util';
import SteamID from 'steamid';
import Field from '@/components/Field.vue'
import SplitTable from '@/components/SplitTable.vue'

const AUTO_REFRESH_INTERVAL_MINUTES = 1
const RECENT_LIMIT = 40
const STEAM_PROFILE_URL_REGEX = new RegExp(/https?:\/\/steamcommunity.com\/profiles\/(\d+)/)

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  privUser: PrivilegedUser
}>()

let selectedTabId = ref("recent")
let users = ref<PlayerData[]>([])
let search = ref({
  query: '',
  func: () => {},
})
let recentPlayers = ref<{server: string|null, list: PlayerData[], loading: boolean, currentOffset:  number}>
({
  server: null,
  list: [],
  loading: false,
  currentOffset: 0
})
let manualInput = ref<string>()
let selectedId = ref<string>()
let servers = ref([])
let admins = ref<ReadableAdminData[]>([])
let loading = ref(false)

const filteredAdmins = computed(() => {
  if(!search.value.query) return admins.value
  const query = search.value.query.toLowerCase()
  return admins.value.filter(admin => {
    return admin.steamid.includes(query) || admin.name.toLowerCase().includes(query)
  })
})

function setTab(tab: any) {
  selectedTabId.value = tab.tab.computedId
  manualInput.value = undefined
  selectedId.value = undefined
  search.value.query = ''
}
function onUserSelected(id: string) {
  selectedId.value = id
  manualInput.value = undefined
  search.value.func()
}
function onManualSelected(id: string) {
  manualInput.value = id
  selectedId.value = "_custom"
  search.value.func()
}
async function searchUser() {
  if(selectedTabId.value !== "search") return
  users.value = []
  let query = manualInput.value ?? search.value.query
  if(query == "") return

  loading.value = true
  const profileMatch = query.match(STEAM_PROFILE_URL_REGEX)
  if(profileMatch && profileMatch.length > 1) {
    const steam2 = new SteamID(profileMatch[1]).getSteam2RenderedID()
    query = steam2
  }

  const response = await request(`/api/users/search/${query}`)
  loading.value = false
  if(response?.ok) {
    const json = await response.json()
    users.value = json.users
  }
}
async function fetchAdmins() {
  const response = await request('/api/admins')
  if(response?.ok) {
    const json = await response.json()
    admins.value = json.admins as ReadableAdminData[]
  }
}
async function getRecentPlayers(offset = 0) {
  recentPlayers.value.loading = true
  const resp = await request(`/api/users/recent/${recentPlayers.value.server || ''}?limit=${RECENT_LIMIT}&offset=${offset}`)
  recentPlayers.value.loading = false
  if(resp?.ok) {
    const json = await resp.json()
    if(offset === 0)
      recentPlayers.value.list = []
    recentPlayers.value.currentOffset = json.meta.nextOffset

    for(const user of json.users) {
      let existing = false
      for(const recUser of recentPlayers.value.list) {
        if(recUser.steamid === user.steamid) {
          existing = true
          break
        }
      }

      if(!existing) {
        recentPlayers.value.list.push(user)
      }
    }
  }
}
async function getServerTypes() {
  const resp = await request(`/api/logs/data`)
  if(resp?.ok) {
    const json = await resp.json()
    servers.value = json.servers.filter((s: string) => s !== "web" && s !== "unknown")
  }
}
onActivated(() => {
  search.value.func = Debounce(searchUser, 400)
  getServerTypes()
  getRecentPlayers()
  setInterval(() => {
    if(route.name == "admin-players")
      getRecentPlayers()
  }, 1000 * 60 * AUTO_REFRESH_INTERVAL_MINUTES)
})
</script>
