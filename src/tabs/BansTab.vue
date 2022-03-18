<template>
<div>
  <BanEditModal v-if="edit.banIndex !== null" :ban="edit.data" @edit="onEdit" :auth="auth" />
  <div class="container is-fluid">
    <div class="columns">
      <div class="column">
        <p class="subtitle is-4">Viewing {{filteredBans.length}} total bans</p>
        <p class="has-text-danger" v-if="ban_error">{{ban_error}}</p>
      </div>
      <div class="column is-2">
        <div class="field has-addons" v-if="auth.state != 2">
          <div class="control">
            <input class="input is-small" type="password" placeholder="Enter a password" v-model="auth.password" @keyup.enter="login()">
          </div>
          <div class="control">
            <a class="button is-info is-small" @click="login()">
              Login
            </a>
          </div>
        </div>
        <p class="has-text-success" v-else-if="auth.state == 2">Authorized</p>
        <p class="has-text-danger" v-if="auth.state == 1">Wrong password</p>
      </div>
      <div class="column is-2">
        <label class="checkbox">
          <input type="checkbox" class="checkbox" v-model="showExpired" />
          Show Expired Bans
        </label>
      </div>
    </div>

    <table class="table is-fullwidth" v-if="!loading&&!error">
      <thead>
        <th style="width:0">Player</th>
        <th>Executor</th>
        <th v-if="auth.state == 2">Reason</th>
        <th>Public Reason</th>
        <th>Flags</th>
        <th>Expires</th>
        <th>Attempts</th>
        <th>Date</th>
        <th v-if="auth.state == 1">Action</th>
      </thead>
      <tbody>
        <tr v-for="(ban, i) in filteredBans" :key="ban.steamid" :class="{'has-text-grey-light': ban.expired}">
          <td>
            <b v-if="ban.last_alias">{{ban.last_alias}}<br></b>
            <em class='has-text-info'>{{ban.steamid}}</em>
          </td>
          <td>
            <template>
              <b v-if="ban.adminName">{{ban.adminName}} </b>
              <template v-else>
                <em v-if="ban.isAdminPlayer" class='has-text-info'>{{ban.executor}}</em>
                <em v-else>{{ban.executor}}</em>
              </template>
              <p class='has-text-info' v-if="ban.source"><em>via {{ban.source}}</em></p>
            </template>

          </td>
          <td v-if="auth.state == 2">
            {{ban.reason}}
          </td>
          <td>
            {{ban.public_message}}
          </td>
          <td>
            <div class="tags" v-html="getBanFlags(ban)"></div>
          </td>
          <td>
            <span v-if="ban.expired" class="has-text-danger">Expired</span>
            <span v-else>{{getRelDate(ban.expires) || 'Never'}}</span>
          </td>
          <td>{{ban.times_tried}}</td>
          <td :data-tooltip="ban.timestamp">{{ban.relDate}}</td>
          <td v-if="auth.state == 2">
            <div class="buttons">
              <a class="button is-info is-small" @click='startEdit(ban, i)'>View</a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="has-text-centered has-text-danger title is-3" v-else-if="error">{{error}}</p>
    <p class="has-text-centered title is-2" v-else><br>Fetching bans...</p>
  </div>
</div>
</template>

<script>
import Sugar from 'sugar'
import auth from '@/mixins/auth.vue'
import BanEditModal from '@/components/BanEditModal'

const DISCORD_SOURCE_REGEX = new RegExp(/([^\n]+#\d{4})\s\((\d+)\)/)

let adminNames = {}

export default {
  mixins: [auth],
  components: { BanEditModal },
  data() {
    return {
      loading: true,
      error: null,
      ban_error: null,
      bans: [],
      edit: {
        data: null,
        banIndex: null,
      },
      edited: {

      },
      shiftPressed: false,
      showExpired: false
    }
  },
  computed: {
    filteredBans() {
      if(this.showExpired) return this.bans
      else return this.bans.filter(ban => !ban.expired)
    }
  },
  methods: {
    onEdit(edit) {
      // TODO: Figure out why it replaces wrong idnex
      if(edit)
        this.$set(this.bans, this.edit.banIndex, edit)
      this.edit.data = null
      this.edit.banIndex = 0
    },
    getBanFlags(ban) {
      let str = ""
      if(ban.flags & 1) str += `<span class='tag' data-tooltip='Player is IP banned'>IP</span>`
      if(ban.flags & 2) str += `<span class='tag is-warning' data-tooltip='Ban is no longer in effect'>S</span>`
      if(ban.appeals > 0) str += `<span class='tag is-success' data-tooltip="Has ban appeal(s)">A</span>`
      if(ban.notes > 0) str += `<span class='tag is-dark' data-tooltip="Has note(s) attached">N</span>`
      return str
    },
    async getAdmins() {
      for(let i = 0; i < this.bans.length; i++) {
        const ban = this.bans[i]
        if(!ban.executor || ban.source === "discord") continue;
        ban.adminName = adminNames[ban.executor];
        if(!ban.adminName && ban.executor.startsWith("STEAM_")) {
          const response = await fetch(`https://jackz.me/l4d2/scripts/get_alias.php?steamid=${ban.executor}`)
          if(response.ok) {
            let bits = ban.executor.split(":")
            bits = bits[bits.length - 1]
            const res = await response.json()
            if(res) {
              adminNames[`STEAM_0:0:${bits}`] = adminNames[`STEAM_1:0:${bits}`] = adminNames[`STEAM_0:1:${bits}`] = res.last_alias
              ban.adminName = res.last_alias
            }
          }
        }
      }
    },
    startEdit(ban, index) {
      this.edit.banIndex = index
      this.edit.data = ban
    },
    getRelDate(time) {
      const date = new Date((time || "").toString().replace(/-/g, "/").replace(/[TZ]/g, " ")),
        diff = (((new Date()).getTime() - date.getTime()) / 1000),
        day_diff = Math.floor(diff / 86400);

      if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31) return;

      return day_diff == 0 && (
      diff < 60 && "just now" || diff < 120 && "1 minute ago" || diff < 3600 && Math.floor(diff / 60) + " minutes ago" || diff < 7200 && "1 hour ago" || diff < 86400 && Math.floor(diff / 3600) + " hours ago") || day_diff == 1 && "Yesterday" || day_diff < 7 && day_diff + " days ago" || day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago";
    }
  },
  created() {
    document.onkeydown = (e) => {
      this.shiftPressed = !!e.shiftKey
    }
    document.onkeyup = (e) => {
      this.shiftPressed = !!e.shiftKey
    }
    fetch('https://jackz.me/l4d2/scripts/bans.php?mode=list')
    .then(response => {
      if(response.ok)
        return response.json()
      else
        this.error = response.statusText
    })
    .then(bans => {
      this.bans = bans.map(ban => {
        const relDate = new Sugar.Date(ban.timestamp*1000).relative()
        if(!ban.last_alias) {
          console.warn(ban.steamid, 'does not have alias')
        }
        const discordBanMatch = ban.executor.match(DISCORD_SOURCE_REGEX)
        if(discordBanMatch && discordBanMatch.length == 3) {
          ban.executor = discordBanMatch[2]
          ban.adminName = discordBanMatch[1]
          ban.source = "discord"
        }
        if(ban.executor === "CONSOLE") ban.executor = '[Automatic]'
        return {
          ...ban,
          relDate,
          adminName: ban.adminName,
          isAdminPlayer: ban.executor.startsWith("STEAM_")
        }
      })
      this.getAdmins()
    })
    .catch(err => {
        console.error('Could not fetch bans, network error.', err)
    })
    .finally(() => this.loading = false)
  }
}

</script>
