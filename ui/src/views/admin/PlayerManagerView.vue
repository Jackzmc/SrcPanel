<template>
<div>
  <router-view :priv-user="privUser" />
  <div class="container">
    <Tabs inner-wrapper-class="tabs is-large" @changed="setTab" :dummy="Date.now()">
      <Tab name="Recently Played With" id="recent">
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
                  <div class="select">
                    <select @change="getRecentPlayers" v-model="recentPlayers.server">
                      <option :value="null">All Servers</option>
                      <option v-for="server in servers" :key="server" :value="server">
                        {{ server}}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="level-item">
                  <a :class="['button','is-info',{'is-loading': recentPlayers.loading}]" @click="getRecentPlayers" >Refresh</a>
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
      </Tab>
      <Tab name="Search for a User" id="search">
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              Search for a player (SteamID2 or name)
            </p>
          </header>
          <div class="card-content">
            <input v-model="search.query" @input="search.func" class="input" type="text" placeholder="STEAM_1:1:####### or a name" style="width:30%">
          </div>
        </div>
        <br>
        <UserSelection has-manual :priv-user="privUser" :users="users" @manual="onManualSelected" />
        <p class="has-text-centered my-6 is-size-5" v-if="!search.query">Enter a search query</p>
        <p class="has-text-centered my-6 is-size-5" v-else-if="users.length === 0">No players found</p>
      </Tab>
      <Tab name="Admins" id="admins" v-if="privUser.hasPermission('admins.view')" @selected="fetchAdmins">
      <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              Search for a player (SteamID2 or name)
            </p>
          </header>
          <div class="card-content">
            <input v-model="search.query" @input="search.func" class="input" type="text" placeholder="STEAM_1:1:####### or a name" style="width:30%">
          </div>
        </div>
        <br>
        <table class="table is-bordered">
          <thead>
            <tr>
              <th>Id</th>
              <th>Name</th>
              <th>SteamID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="admin in filteredAdmins" :key="admin.id">
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
      </Tab>
    </Tabs>
    <br>
  </div>
  <br><br>
</div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, computed } from 'vue'
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

const AUTO_REFRESH_INTERVAL_MINUTES = 1
const RECENT_LIMIT = 20
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
let recentPlayers = ref<{server: string|null, list: PlayerData[], loading: boolean}>
({
  server: null,
  list: [],
  loading: false
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
async function getRecentPlayers() {
  recentPlayers.value.loading = true
  const resp = await request(`/api/users/recent/${recentPlayers.value.server || ''}?limit=${RECENT_LIMIT}`)
  recentPlayers.value.loading = false
  if(resp?.ok) {
    const json = await resp.json()
    recentPlayers.value.list = []

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
    servers.value = json.servers
  }
}
onBeforeMount(() => {
  search.value.func = Debounce(searchUser, 400)
  getServerTypes()
  getRecentPlayers()
  setInterval(() => {
    if(route.name == "admin-players")
      getRecentPlayers()
  }, 1000 * 60 * AUTO_REFRESH_INTERVAL_MINUTES)
})
</script>
