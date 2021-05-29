<template>
  <div class="container">
    <p class="has-text-danger" v-if="ban_error">{{ban_error}}</p>
    <table class="table is-fullwidth" v-if="!loading&&!error">
      <thead>
        <th>Player</th>
        <th>Executor</th>
        <th>Reason</th>
        <th>Expires</th>
        <th>Date</th>
        <th>Action</th>
      </thead>
      <tbody>
        <tr v-for="(ban, i) in bans" :key="ban.steamid" :class="{'has-text-danger': ban.expired}">
          <td>
            <b v-if="ban.last_alias">{{ban.last_alias}} </b>
            <em class='has-text-info'>{{ban.steamid}}</em>
          </td>
          <td>
            <input class="input" type="text" v-if="edited && edited.steamid == ban.steamid" v-model="edited.executor" maxlength="32" />
            <template v-else>
              <b v-if="ban.adminName">{{ban.adminName}} </b>
              <template v-else>
                <em v-if="ban.isAdminPlayer" class='has-text-info'>{{ban.executor}}</em>
                <em v-else>{{ban.executor}}</em>
              </template>
            </template>

          </td>
          <td>
            <input class="input" type="text" v-if="edited && edited.steamid == ban.steamid" v-model="edited.reason" maxlength="128" />
            <span v-else>{{ban.reason}}</span>
          </td>
          <td>
            <div class="select" v-if="edited && edited.steamid == ban.steamid">
              <select v-model="edited.expires">
                <option value="never" v-if="ban.expires">Never</option>
                <option value="keep">Keep Same</option>
                <option value="1hour">1 Hour</option>
                <option value="1day">1 Day</option>
                <option value="1day">1 Day</option>
                <option value="1week">1 Week</option>
                <option value="1month">1 Month</option>
              </select>
            </div>
            <span v-else-if="ban.expired" class="has-text-danger">Expired</span>
            <span v-else>{{ban.expires || 'Never'}}</span>
          </td>
          <td :data-tooltip="ban.timestamp">{{ban.relDate}}</td>
          <td>
            <div class="buttons">
              <template v-if="edited && edited.steamid == ban.steamid">
                <a class="button is-success is-small" @click='saveEdit()' v-if="editChanged">Save</a>
                <a class="button is-small" @click='edited = null'>Cancel Edit</a>
              </template>
              <template v-else>
                <a class="button is-warning is-small" @click='edit(ban, i)'>Edit</a>
                <a class="button is-danger is-small" @click='unban(ban, i)' data-tooltip="Hold shift to confirm" :disabled="!shiftPressed">Remove Ban</a>
              </template>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="has-text-centered has-text-danger title is-3" v-else-if="error">{{error}}</p>
    <p class="has-text-centered title is-2" v-else><br>Fetching bans...</p>
  </div>
</template>

<script>
import Sugar from 'sugar'

let adminNames = {}

export default {
  data() {
    return {
      loading: true,
      error: null,
      ban_error: null,
      bans: [],
      edited: null,
      shiftPressed: false,
      editChanged: false
    }
  },
  watch: {
    edited: {
      handler(val) {
        if(this.editChanged) return
        const ban = this.bans.find(ban => ban.steamid === this.edited.steamid)
        console.log(ban.reason !== this.edited.reason)
        this.editChanged = ban.reason !== this.edited.reason
          || ban.executor !== this.edited.executor
          || ban.expires !== "keep"
      },
      deep: true
    }
  },
  methods: {
    async getAdmins() {
      for(let i = 0; i < this.bans.length; i++) {
        const ban = this.bans[i]
        if(!ban.executor) continue;
        ban.adminName = adminNames[ban.executor];
        if(!ban.adminName && ban.executor.startsWith("STEAM_")) {
          const response = await fetch(`https://jackz.me/l4d2/scripts/get_alias.php?steamid=${ban.executor}`)
          if(response.ok) {
            const {last_alias} = await response.json()
            adminNames[ban.executor] = last_alias
            ban.adminName = last_alias
          }
        }
      }
    },
    unban(ban, index) {
      fetch(`https://jackz.me/l4d2/scripts/bans.php?mode=delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: "steamid=" + ban.steamid
      })
      .then(async(response) => {
        if(response.ok) {
          this.bans.slice(index, 1)
        } else
          this.ban_error = await response.text()
      })
      .catch(err => {
        this.ban_error = err.message
      })
    },
    edit(ban, index) {
      this.editChanged = false
      this.edited = {
        index,
        ...ban,
        expires: 'keep'
      }
    },
    saveEdit() {
      const expires = getExpires(this.edited, this.bans[this.edited.index])
      fetch(`https://jackz.me/l4d2/scripts/bans.php?mode=update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          steamid: this.edited.steamid,
          reason: this.edited.reason,
          executor: this.edited.executor,
          expires
        })
      })
      .then(async(response) => {
        if(response.ok) {
          if(this.edited.expires === "same") this.edited.expires = this.bans[index].expires
          this.$set(this.bans, this.edited.index, this.edited)
          this.edited = null
        } else
          this.ban_error = await response.text()
      })
      .catch(err => {
        this.ban_error = err.message
      })

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
        const relDate = new Sugar.Date(ban.timestamp, { fromUTC: true }).relative()

        return {
          ...ban,
          relDate,
          adminName: null,
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

function getExpires(edited, ban) {
  const baseDate = new Date().valueOf()

  if(edited.expires === "keep") return null
  else if(edited.expires === "never") return "never"
  else if(edited.expires === "1hour") {
    return (baseDate + 3.6e+6) / 1000
  }else if(edited.expires === "1day") {
    return (baseDate + 8.64e+7) / 1000
  }else if(edited.expires === "1week") {
    return (baseDate + 6.048e+8) / 1000
  } else if(edited.expires === "1month") {
    return (baseDate + 2629800000) / 1000
  } else {
    alert('Could not save unknown value: ' + edited.expires)
    return null
  }
}

function getRelDate(time) {
  const date = new Date((time || "").toString().replace(/-/g, "/").replace(/[TZ]/g, " ")),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);

  if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31) return;

  return day_diff == 0 && (
  diff < 60 && "just now" || diff < 120 && "1 minute ago" || diff < 3600 && Math.floor(diff / 60) + " minutes ago" || diff < 7200 && "1 hour ago" || diff < 86400 && Math.floor(diff / 3600) + " hours ago") || day_diff == 1 && "Yesterday" || day_diff < 7 && day_diff + " days ago" || day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago";
}
</script>
