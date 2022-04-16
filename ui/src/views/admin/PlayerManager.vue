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
      <a class="button is-warning" @click="addAdmin" v-if="hasCreateAdminPerms" :disabled="isAddAdminDisabled" :data-tooltip="isAddAdminDisabled?'Cannot add an unknown player as admin':null">Add Admin</a>
    </div>
  </div>
</div>
</template>

<script>
import UserSelection from '@/components/UserSelection'

// Keep track and open gui for each ban
import Debounce from '@/js/debounce.js'

export default {
  components: {
    UserSelection,
  },
  props: ['userdata'],
  data() {
    return {
      tabIndex: 0,
      users: [],
      userSearch: null,
      search: {
        query: null,
        func: null
      },
      recentPlayers: {
        list: [],
        server: null
      },
      manualInput: null,
      selectedId: null,
      servers: []
    }
  },
  computed: {
    isManualInputEntered() {
      return this.manualInput != null && this.manualInput.length > 0
    },
    selectedIdSteamID() {
      return this.manualInput ?? this.selectedId
    },
    hasCreateAdminPerms() {
      return this.userdata?.permissions.immunityLevel > 0 && this.userdata?.permissions.web.role > 1
    },
    isAddAdminDisabled() {
      return !this.selectedId || this.selectedId === '_custom'
    }
  },
  methods: {
    setTab(index) {
      this.tabIndex = index
      this.manualInput = null
      this.selectedId = null
    },
    onUserSelected(id) {
      this.selectedId = id
    },
    onManualSelected(id) {
      this.manualInput = id
      this.selectedId = "_custom"
    },
    addBan() {
      if(!this.selectedIdSteamID) return alert("No steamID selectedId")
      this.$router.push(`/admin/players/${this.selectedIdSteamID}/add-ban`)
    },
    addAdmin() {
      if(!this.selectedIdSteamID) return alert("No steamID selectedId")
      this.$router.push(`/admin/players/${this.selectedIdSteamID}/add-admin`)
    },
    async searchUser() {
      this.selectedId = null
      const response = await fetch(`/api/users/search/${this.search.query}`)
      if(response.ok) {
        const json = await response.json()
        this.users = json.users
      }
    },
    formatDate(time) {
      const date = new Date(time*1000)
      return date.toLocaleString()
    },
    async getRecentPlayers() {
      const resp = await fetch(`/api/users/recent/${this.recentPlayers.server||''}?limit=10`)
      if(resp.ok) {
        const json = await resp.json()

        this.recentPlayers.list = []

        for(const user of json.users) {
          let existing = false
          for(const recUser of this.recentPlayers.list) {
            if(recUser.steamid === user.steamid) {
              existing = true
              break
            }
          }
          if(!existing) {
            this.recentPlayers.list.push(user)
          }
        }
      }
    },
    async getServerTypes() {
      const resp = await fetch(`/api/logs/servers`)
      if(resp.ok) {
        const json = await resp.json()
        this.servers = json.servers
      }
    }
  },
  created() {
    this.search.func = Debounce(this.searchUser, 400)
    this.getServerTypes()
    this.getRecentPlayers()
  }
}
</script>
