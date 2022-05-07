<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title" v-if="user"><b>{{user.name}}</b> <span class="is-pulled-right">{{user.steamid}}</span></p>
        <p v-else>Loading...</p>
        &nbsp;&nbsp;
      </header>
      <section class="modal-card-body" v-if="user&&userdata.permissions.web.">
        <div class="field">
          <label class="label">Playtime</label>
          <span>
            <p v-if="stats">{{playtime}} hours</p>
            <em v-else>(no recorded statistics found)</em>
            <p class="help has-text-danger" v-if="hoursPlayed < 1">Does not meet the minimum amount of {{$options.MIN_HOURS_PLAYTIME}} hours played</p>
          </span>
        </div>
        <div class="field">
          <label class="label">Immunity</label>
          <div class="control">
            <input
              type="number"
              class="input"
              v-model="form.immunity"
              min="0" :max="userdata.permissions.immunityLevel - 1"
            />
          </div>
          <p class="help has-text-danger" v-if="form.immunity >= userdata.permissions.immunityLevel">The maximum immunity level you can apply is {{userdata.permissions.immunityLevel - 1}}</p>
        </div>
        <h6 class="title is-6">Flags</h6>
        <p class="subtitle is-6">Only flags you have access to can be added</p>
        <div class="field">
          <input
            id="z"
            type="checkbox"
            value="z"
            class="is-checkradio"
            v-model="form.flags"
            disabled
            data-tooltip="Only superadmins have permission to add other root users"
          >
          <label>Root (All Permissions)</label>
        </div>
        <div class="field" v-for="(name, flag) in $options.FLAGS" :key="flag">
          <input
            :id="flag"
            type="checkbox"
            :value="flag"
            class="is-checkradio has-tooltip-right"
            v-model="form.flags"
            :disabled="!hasRoot && userdata.permissions.flags.indexOf(flag) === -1"
            data-tooltip="Only superadmins have permission to add other root users"
          >
          <label :for="flag">{{name}}</label>
        </div>
      </section>
      <footer class="modal-card-foot">
        <button
          :class="['button','has-tooltip-top', 'is-success',{'is-loading': loading}]"
          :disabled="cantAddAdmin"
          @click="save"
        >Add Admin</button>
        <button :class="['button',{'is-loading': loading}]" @click="cancel">Cancel</button>
        <p class="has-text-danger" v-if="error">{{error}}</p>
      </footer>
    </div>
  </div>
</template>

<script>
const MIN_HOURS_PLAYTIME = 10

const FLAGS = {
  'a': 'Reserved Slot',
  'b': 'Generic Admin',
  'c': 'Kick',
  'd': 'Ban',
  'e': 'Unban',
  'f': 'Slay/harm others',
  'g': 'Change the map',
  'h': 'Change cvar rules',
  'i': 'Execute custom config files',
  'j': 'Use admin chat',
  'k': 'Start a generic vote',
  // 'l': 'Set a password on the server',
  'm': 'Ingame rcon access',
  'n': 'Enable sv_cheats or use cheat commands',
  'o': 'Custom 1',
  'p': 'Custom 2',
  'q': 'Custom 3',
  'r': 'Custom 4',
  's': 'Custom 5',
  't': 'Custom 6',
}

import SteamID from 'steamid'
export default {
  FLAGS,
  MIN_HOURS_PLAYTIME,
  name: 'AddAdminModal',
  props: ['userdata'],
  data() {
    return {
      user: null,
      form: {
        flags: [],
        immunity: 0
      },
      stats: null,
      loading: false,
      error: null
    }
  },
  computed: {
    hasRoot() {
      return this.userdata.permissions.flags.includes('z')
    },
    hoursPlayed() {
      if(!this.stats) return
      return Math.round(this.stats.minutes_played / 60)
    },
    playtime() {
      if(!this.stats) return
      if(this.hoursPlayed > 0) return this.hoursPlayed
      return "< 0"
    },
    noAddReasons() {
      const msgs = []
      if(this.hoursPlayed < MIN_HOURS_PLAYTIME) {
        msgs.push(`A minimum of ${MIN_HOURS_PLAYTIME} hours of playtime is required.`)
      }
      return msgs
    },
    cantAddAdmin() {
      return this.noAddReasons.length > 0
    }
  },
  methods: {
    async init() {
      this.error = null
      this.loading = true
      const response = await fetch(`/api/users/${this.$route.params.id}`)
      this.loading = false
      if(response.ok) {
        const json = await response.json()
        if(!json.user) {
          console.error('No users were found for id?')
          return
        }
        this.user = json.user
      }
    },
    async fetchStats() {
      this.loading = true
      const response = await fetch(`https://stats.jackz.me/api/user/${this.$route.params.id}`)
      this.loading = false
      if(response.ok) {
        const json = await response.json()
        if(json.user) {
          this.stats = json.user
        } else {
          console.error('No stats found for user')
        }
      }
    },
    save() {
      if(this.cantAddAdmin) {
        alert(`Cannot add admin for the following reasons:\n* ${this.noAddReasons.join('\n *')}`)
      } else {

      }
    },
    cancel() {
      this.$router.back()
    }
  },
  mounted() {
    this.init()
    this.fetchStats()
  }
}
</script>
