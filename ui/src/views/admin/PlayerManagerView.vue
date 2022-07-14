<template>
<div>
  <router-view v-if="userdata" :userdata="userdata" />
  <div class="container" v-if="userdata">
    <Tabs inner-wrapper-class="tabs is-large" @changed="setTab">
      <Tab name="Recently Played With" id="recent">
        <h4 class="title is-4">Recently Played From</h4>
        <div class="level">
          <div class="level-left">
            <div class="level-item">
              <div class="select">
                <select @change="getRecentPlayers" v-model="recentPlayers.server">
                  <option v-for="server in servers" :key="server" :value="server">
                    {{ server || "All Servers" }}
                  </option>
                </select>
              </div>
            </div>
            <div class="level-item">
              <a class="button is-info" @click="getRecentPlayers">Refresh</a>
            </div>
            <div class="level-item">
              <em>auto refreshing every {{AUTO_REFRESH_INTERVAL_MINUTES}} minutes</em>
            </div>
          </div>
        </div>
        <UserSelection :userdata="userdata" :users="recentPlayers.list" @select="onUserSelected" @manual="onManualSelected" />
      </Tab>
      <Tab name="Search for a User" id="search">
        <div class="field">
        <label class="label">Search for a player (SteamID2 or name)</label>
        <div class="control">
          <input v-model="search.query" @input="search.func" class="input" type="text" placeholder="STEAM_1:1:####### or a name">
        </div>
      </div>
      <UserSelection has-manual :userdata="userdata" :users="users" @select="onUserSelected" @manual="onManualSelected" />
      </Tab>
      <Tab name="Admins" id="admins" v-if="privUser.hasWebPerm(WebPermission.ManageAdmins)" @selected="fetchAdmins">
        <table class="table">
          <thead>
            <tr>
              <th></th>
              <th>Id</th>
              <th>SteamID</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="admin in admins" :key="admin.id">
              <td>
                <input v-if="admin.steamid !== userdata.user.steamid" type="radio" v-model="selectedId" :value="admin.steamid">
              </td>
              <td>{{ admin.id }}</td>
              <td>{{ admin.steamid }}</td>
              <td>{{ admin.name }}</td>
            </tr>
          </tbody>
        </table>
      </Tab>
    </Tabs>
    <br>
  </div>
  <br><br>
  <nav class="navbar is-fixed-bottom is-dark"  v-if="selectedUser">
    <div class="navbar-menu" style="margin-left: 5em">
      <div class="navbar-item" v-if="!addBanDisableReason">
        <a class="button is-danger" @click="addBan" >Ban</a>
      </div>
      <div class="navbar-item" v-if="hasCreateAdminPerms&&!addAdminDisableReason">
        <a class="button is-warning" @click="addAdmin"   :data-tooltip="addAdminDisableReason">{{adminButton}}</a>
      </div>
    </div>
  </nav>
</div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, computed } from 'vue'
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { Session, WebPermission, ReadableAdminData } from '../../../../common-types/User';
import UserSelection from '@/components/UserSelection.vue'
// @ts-ignore
import {Tabs, Tab} from 'vue3-tabs-component';
// Keep track and open gui for each ban
import Debounce from '@/js/debounce'

const AUTO_REFRESH_INTERVAL_MINUTES = 2
const RECENT_LIMIT = 15

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  userdata: Session
}>()
const privUser = new PrivilegedUser(props.userdata)

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

const isManualInputEntered = computed(() => {
  return manualInput.value != null && manualInput.value.length > 0
})
const selectedIdSteamID = computed(() => {
  return manualInput.value ?? selectedId.value
})
const selectedUser = computed(() => {
  if(!selectedId.value) return
  if(selectedTabId.value === "recent")
    return recentPlayers.value.list.find(rp => rp.steamid == selectedId.value)
  else if(selectedTabId.value === "search")
    return users.value.find(user => user.steamid == selectedId.value)
  else if(selectedTabId.value === "admins") {
    const admin = admins.value.find((user: ReadableAdminData) => user.steamid == selectedId.value)
    if(admin) {
      return {
        ...admin,
        isAdmin: true
      }
    }
  }
  return undefined
})
const hasCreateAdminPerms = computed(() => {
  return privUser.immunityLevel > 0 && privUser.hasWebPerm(WebPermission.ManageAdmins)
})
const addAdminDisableReason = computed(() => {
  //!selectedId || (selectedId === '_custom' && !manualInput)
  if(!selectedId.value) return 'No player selected'
  // if(selectedId.value === '_custom') return 'Cannot add an unknown player as admin'
  // if(selectedRecentUser.value?.isAdmin) return 'Selected player is already an admin'
  return null
})
const adminButton = computed(() => {
  if(selectedUser.value) {
    if('isAdmin' in selectedUser.value && selectedUser.value?.isAdmin) return "Edit Admin"
    else return "Make Admin"
  }
  return "Add / Edit Admin"
})
const addBanDisableReason = computed(() => {
  if(!selectedId.value || (selectedId.value === '_custom' && !manualInput.value)) return 'No player selected'
  if('isAdmin' in selectedUser.value! && selectedUser.value?.isAdmin) return 'Selected player is an admin'
  return null
})
function setTab(tab: any) {
  selectedTabId.value = tab.tab.computedId
  manualInput.value = undefined
  selectedId.value = undefined
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
function addBan() {
  if(!selectedIdSteamID.value) return alert("No steamID selectedId")
  router.push(`/admin/players/${selectedIdSteamID.value}/add-ban`)
}
function addAdmin() {
  if(!selectedIdSteamID.value) return alert("No steamID selectedId")
  router.push(`/admin/players/${selectedIdSteamID.value}/manage-admin`)
}
async function searchUser() {
  selectedId.value = undefined
  const response = await fetch(`/api/users/search/${manualInput.value ?? search.value.query}`)
  if(response.ok) {
    const json = await response.json()
    users.value = json.users
  }
}
async function fetchAdmins() {
  const response = await fetch('/api/admins')
  if(response.ok) {
    const json = await response.json()
    admins.value = json.admins as ReadableAdminData[]
  }
}
async function getRecentPlayers() {
  recentPlayers.value.loading = true
  const resp = await fetch(`/api/users/recent/${recentPlayers.value.server||''}?limit=${RECENT_LIMIT}`)
  recentPlayers.value.loading = false
  if(resp.ok) {
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
  const resp = await fetch(`/api/logs/servers`)
  if(resp.ok) {
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
