<template>
  <table class="table is-striped is-fullwidth">
    <thead>
      <tr>
        <th></th>
        <th>Name</th>
        <th>SteamID</th>
        <th>Country</th>
        <th>Bans</th>
        <th>Notes</th>
        <th>Last Joined</th>
        <th>First Joined</th>
        <th v-if="!hasManual">Server</th>
      </tr>
    </thead>
    <tbody>
    <tr v-for="user in users" :key="user.steamid">
      <td>
        <input v-if="user.steamid !== userdata.user.steamid" type="radio" v-model="selectedId" :value="user.steamid">
      </td>
      <td>
        <b>{{user.name}}</b>
        <span v-if="user.isAdmin" class="tag is-info ml-1">Admin</span>
      </td>
      <td><a :href="'https://stats.jackz.me/user/' + user.steamid">{{user.steamid}}</a></td>
      <td>{{user.country}}</td>
      <td>
        <span :class="{'has-text-grey': user.bansCount == 0}">{{user.bansCount}}</span>
      </td>
      <td>
        <span :class="{'has-text-grey': user.notesCount == 0}">{{user.notesCount}}</span>
      </td>
      <td>{{formatDate(user.lastJoinDate)}}</td>
      <td>{{formatDate(user.firstJoinDate)}}</td>
      <td v-if="!hasManual">{{user.server}}</td>
    </tr>
    </tbody>
    <tfoot v-if="hasManual">
      <tr>
        <td><input type="radio" v-model="selectedId" value="_custom"></td>
        <td><input type="text" class="input" v-model="manualInput" placeholder="STEAM_1:1:" /></td>
        <td><b>Manual Input</b></td>
      </tr>
    </tfoot>
  </table>
</template>

<script>
export default {
  props: {
    users: Array,
    userdata: Object,
    hasManual: Boolean,
  },
  data() {
    return {
      selectedId: null,
      manualInput: null,
      isAddAdminDisabled: false,
    }
  },
  watch: {
    selectedId(){
      if(this.selectedId !== "_custom")
        this.$emit('select', this.selectedId)
    },
    manualInput() {
      if(this.selectedId === "_custom")
        this.$emit('manual', this.manualInput)
    }
  },
  methods: {
    formatDate(timestamp) {
      const date = new Date(timestamp * 1000)
      return date.toLocaleDateString()
    },
  },
}
</script>
