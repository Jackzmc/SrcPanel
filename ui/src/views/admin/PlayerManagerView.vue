<template>
<div>
  <router-view v-if="userdata" :userdata="userdata" />
  <div class="container" v-if="userdata">
    <div class="tabs is-large">
      <ul>
        <li :class="{'is-active': tabIndex == 0}"><a @click="setTab(0)">Recently Played With</a></li>
        <li :class="{'is-active': tabIndex == 1}"><a @click="setTab(1)">Search for a User</a></li>
      </ul>
    </div>
    <template v-if="tabIndex == 0">
      <h4 class="title is-4">Recently Played From</h4>
      <div class="select">
        <select @change="getRecentPlayers" v-model="recentPlayers.server">
          <option v-for="server in servers" :key="server" :value="server">
            {{ server || "All Servers" }}
          </option>
        </select>
      </div>
      &nbsp;<a class="button is-info" @click="getRecentPlayers">Refresh</a>
      <UserSelection :userdata="userdata" :users="recentPlayers.list" @select="onUserSelected" @manual="onManualSelected" />
    </template>
    <template v-else-if="tabIndex == 1">
      <div class="field">
        <label class="label">Search for a player (SteamID2 or name)</label>
        <div class="control">
          <input v-model="search.query" @input="search.func" class="input" type="text" placeholder="STEAM_1:1:####### or a name">
        </div>
      </div>
      <UserSelection has-manual :userdata="userdata" :users="users" @select="onUserSelected" @manual="onManualSelected" />
    </template>
    <div class="buttons">
      <a class="button is-primary" @click="addBan" :disabled="!selectedId || (selectedId === '_custom' && !manualInput)">Add Ban</a>
      <a class="button is-warning" @click="addAdmin" v-if="hasCreateAdminPerms" :disabled="addAdminDisableReason" :data-tooltip="addAdminDisableReason">Add Admin</a>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, computed } from 'vue'
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { Session, WebPermission } from '../../../../common-types/User';
import UserSelection from '@/components/UserSelection.vue'
// Keep track and open gui for each ban
import Debounce from '@/js/debounce'

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  userdata: Session
}>()
const privUser = new PrivilegedUser(props.userdata)

// TODO: Disable add admin when selected is admin

let tabIndex = ref(0)
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

const isManualInputEntered = computed(() => {
  return manualInput.value != null && manualInput.value.length > 0
})
const selectedIdSteamID = computed(() => {
  return manualInput.value ?? selectedId.value
})
const selectedRecentUser = computed(() => {
  if(!selectedId.value) return
  if(tabIndex.value == 0)
    return recentPlayers.value.list.find(rp => rp.steamid == selectedId.value)
  else
    return users.value.find(user => user.steamid == selectedId.value)
})
const hasCreateAdminPerms = computed(() => {
  return privUser.immunityLevel > 0 && privUser.hasWebPerm(WebPermission.ManageAdmins)
})
const addAdminDisableReason = computed(() => {
  if(!selectedId.value) return 'No player selected'
  if(selectedId.value === '_custom') return 'Cannot add an unknown player as admin'
  if(selectedRecentUser.value?.isAdmin) return 'Selected player is already an admin'
  return null
})
function setTab(index: number) {
  tabIndex.value = index
  manualInput.value = undefined
  selectedId.value = undefined
}
function onUserSelected(id: string) {
  selectedId.value = id
}
function onManualSelected(id: string) {
  manualInput.value = id
  selectedId.value = "_custom"
}
function addBan() {
  if(!selectedIdSteamID.value) return alert("No steamID selectedId")
  router.push(`/admin/players/${selectedIdSteamID.value}/add-ban`)
}
function addAdmin() {
  if(!selectedIdSteamID.value) return alert("No steamID selectedId")
  router.push(`/admin/players/${selectedIdSteamID.value}/add-admin`)
}
async function searchUser() {
  selectedId.value = undefined
  const response = await fetch(`/api/users/search/${search.value.query}`)
  if(response.ok) {
    const json = await response.json()
    users.value = json.users
  }
}
function formatDate(time:number) {
  const date = new Date(time*1000)
  return date.toLocaleString()
}
async function getRecentPlayers() {
  recentPlayers.value.loading = true
  const resp = await fetch(`/api/users/recent/${recentPlayers.value.server||''}?limit=10`)
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
})
</script>
