<template>
<div>
  <BanEditModal v-if="edit.banIndex !== null" :ban="edit.data" @edit="onEdit" :userdata="userdata" />
  <div class="container is-fluid">
    <div class="columns">
      <div class="column">
        <p class="subtitle is-4">Viewing {{filteredBans.length}} total bans</p>
        <p class="has-text-danger" v-if="ban_error">{{ban_error}}</p>
      </div>
      <div class="column is-2">
        <p v-if="userdata" class="has-text-success">Hello {{userdata.user.name}}</p>
        <LoginButton v-else />
      </div>
      <div class="column is-2">
        <label class="checkbox">
          <input type="checkbox" class="checkbox" v-model="showOnlyAppeals" />
          Only Appeals
        </label>
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
        <th v-if="userdata">Reason</th>
        <th>Public Reason</th>
        <th>Flags</th>
        <th>Expires</th>
        <th>Attempts</th>
        <th>Date</th>
        <th v-if="userdata">Action</th>
      </thead>
      <tbody>
        <tr v-for="(ban, i) in filteredBans" :key="ban.id" :class="{'has-text-grey-light': ban.expired}">
          <td>
            <b v-if="ban.client.name">{{ban.client.name}}<br></b>
            <em class='has-text-info'>{{ban.client.id}}</em>
          </td>
          <td>
            <template>
              <b v-if="ban.executor.name">{{ban.executor.name}} </b>
              <template v-else>
                <em v-if="ban.executor.name" class='has-text-info'>{{ban.executor.name}}</em>
                <em v-else>{{ban.executor.id}}</em>
              </template>
              <p class='has-text-info' v-if="ban.executor.source"><em>via {{ban.executor.source}}</em></p>
            </template>

          </td>
          <td v-if="userdata">
            {{ban.reason}}
          </td>
          <td>
            {{ban.pubicReason}}
          </td>
          <td>
            <div class="tags" v-html="getBanFlags(ban)"></div>
          </td>
          <td>
            <span v-if="ban.expired" class="has-text-danger">Expired</span>
            <span v-else>{{getRelDate(ban.expires) || 'Never'}}</span>
          </td>
          <td>{{ban.joinAttempts}}</td>
          <td :data-tooltip="ban.timestamp">{{ban.relDate}}</td>
          <td v-if="userdata">
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
import BanEditModal from '@/components/BanEditModal'
import LoginButton from '@/components/LoginButton'

const DISCORD_SOURCE_REGEX = new RegExp(/([^\n]+#\d{4})\s\((\d+)\)/)

export default {
  components: { BanEditModal, LoginButton },
  props: ['userdata'],
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
      shiftPressed: false,
      showExpired: false,
      showOnlyAppeals: false
    }
  },
  computed: {
    filteredBans() {
      return this.bans.filter(ban => {
        if(!this.showExpired && ban.expired) return false
        if(this.showOnlyAppeals && ban.appealsCount == 0) return false
        return true
      })
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
      if(ban.appealsCount > 0) str += `<span class='tag is-success' data-tooltip="Has ban appeal(s)">A</span>`
      if(ban.notesCount > 0) str += `<span class='tag is-dark' data-tooltip="Has note(s) attached">N</span>`
      return str
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
    fetch('/api/bans', { credentials: 'include' })
    .then(response => {
      if(response.ok)
        return response.json()
      else
        this.error = response.statusText
    })
    .then(result => {
      if(result.error) {
        return this.ban_error = result.message || result.error
      }
      this.bans = result.bans.map(ban => {
        const relDate = new Sugar.Date(ban.timestamp*1000).relative()
        const discordBanMatch = ban.executor.id.match(DISCORD_SOURCE_REGEX)
        if(discordBanMatch && discordBanMatch.length == 3) {
          ban.executor.id = discordBanMatch[2]
          ban.executor.name = discordBanMatch[1]
          ban.executor.source = "discord"
        }
        if(ban.executor.id === "CONSOLE") ban.executor.id = '[Automatic]'
        return {
          ...ban,
          relDate,
        }
      })
    })
    .catch(err => {
        console.error('Could not fetch bans, network error.', err)
    })
    .finally(() => this.loading = false)
  }
}

</script>
