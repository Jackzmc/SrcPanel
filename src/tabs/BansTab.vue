<template>
  <div class="container">
    <table class="table is-fullwidth" v-if="!loading&&!error">
      <thead>
        <th>Player</th>
        <th>Executor</th>
        <th>Reason</th>
        <th>Date</th>
      </thead>
      <tbody>
        <tr v-for="ban in bans" :key="ban.steamid" :class="{'has-text-danger': ban.expired}">
          <td>
            <b v-if="ban.last_alias">{{ban.last_alias}} </b>
            <em class='has-text-info'>{{ban.steamid}}</em>
          </td>
          <td>
            <b v-if="ban.adminName">{{ban.adminName}} </b>
            <template v-else>
              <em v-if="ban.isAdminPlayer" class='has-text-info'>{{ban.executor}}</em>
              <em v-else>{{ban.executor}}</em>
            </template>
          </td>
          <td>{{ban.reason}}</td>
          <td :data-tooltip="ban.timestamp">{{ban.relDate}}</td>
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
      bans: []
    }
  },
  computed: {

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
    }
  },
  created() {
    fetch('https://jackz.me/l4d2/scripts/bans.php')
    .then(response => {
      if(response.ok)
        return response.json()
      else
        this.error = response.statusText
    })
    .then(bans => {
      this.bans = bans.map(ban => {
        const expired = ban.expires != null && Number(ban.expires) <= Date.now()
        const relDate = new Sugar.Date(ban.timestamp).relative()

        return {
          ...ban,
          expired,
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

function getRelDate(time) {
  const date = new Date((time || "").toString().replace(/-/g, "/").replace(/[TZ]/g, " ")),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);

  if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31) return;

  return day_diff == 0 && (
  diff < 60 && "just now" || diff < 120 && "1 minute ago" || diff < 3600 && Math.floor(diff / 60) + " minutes ago" || diff < 7200 && "1 hour ago" || diff < 86400 && Math.floor(diff / 3600) + " hours ago") || day_diff == 1 && "Yesterday" || day_diff < 7 && day_diff + " days ago" || day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago";
}
</script>
