<template>
<div>
  <router-view v-if="userdata" :userdata="userdata" />
  <div class="container" v-if="userdata">
    <div class="buttons">
    </div>
    <div class="field">
      <label class="label">Search for a player (SteamID2 or name)</label>
      <div class="control">
        <input v-model="search.query" @input="search.func" class="input" type="text" placeholder="STEAM_1:1:####### or a name">
      </div>
    </div>
    <table class="table is-striped is-fullwidth">
      <thead>
        <tr>
          <th></th>
          <th>SteamID</th>
          <th>Name</th>
          <th>Country</th>
          <th>Bans</th>
          <th>Notes</th>
          <th>Last Joined</th>
          <th>First Joined</th>
        </tr>
      </thead>
      <tbody>
      <tr v-for="user in users" :key="user.steamid">
        <td>
          <input v-if="user.steamid !== userdata.user.steamid" type="radio" v-model="selectedId" :value="user.steamid">
        </td>
        <td><a :href="'https://stats.jackz.me/user/' + user.steamid">{{user.steamid}}</a></td>
        <td>
          <b>{{user.name}}</b>
          <span v-if="user.isAdmin" class="tag is-info ml-1">Admin</span>
        </td>
        <td>{{user.country}}</td>
        <td>
          <span :class="{'has-text-grey': user.bansCount == 0}">{{user.bansCount}}</span>
        </td>
        <td>
          <span :class="{'has-text-grey': user.notesCount == 0}">{{user.notesCount}}</span>
        </td>
        <td>{{formatDate(user.lastJoinDate)}}</td>
        <td>{{formatDate(user.firstJoinDate)}}</td>
      </tr>
      </tbody>
      <tfoot>
        <tr>
          <td><input type="radio" v-model="selectedId" value="_custom"></td>
          <td><input type="text" class="input" v-model="manualInput" placeholder="STEAM_1:1:" /></td>
          <td><b>Manual Input</b></td>
        </tr>
      </tfoot>
    </table>
    <div class="buttons">
      <a class="button is-primary" @click="addBan" :disabled="!selectedId || (selectedId === '_custom' && !manualInput)">Add Ban</a>
      <a class="button is-warning" @click="addAdmin" v-if="hasCreateAdminPerms" :disabled="isAddAdminDisabled" :data-tooltip="isAddAdminDisabled?'Cannot add an unknown player as admin':null">Add Admin</a>
    </div>
  </div>
</div>
</template>

<script>

// Keep track and open gui for each ban
import Debounce from '@/js/debounce.js'

export default {
  props: ['userdata'],
  data() {
    return {
      users: [],
      userSearch: null,
      search: {
        query: null,
        func: null
      },
      manualInput: null,
      selectedId: null
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
    }
  },
  created() {
    this.search.func = Debounce(this.searchUser, 400)
  }
}
</script>
