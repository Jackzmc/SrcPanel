<template>
<div>
  <div class="container">
    <div class="columns">
      <div class="column is-narrow" v-for="(list, filter) in $options.FILTERS" :key="filter">
        <label class="label">{{ formatFilter(filter) }}</label>
        <div class="select is-multiple">
          <select multiple v-model="filters[filter]">
            <option v-for="entry in list" :key="entry" :value="entry">{{entry}}</option>
          </select>
        </div>
      </div>
    </div>
  </div>
    <hr>
  <div class="container is-fluid">
    <table class="table is-fullwidth is-striped is-hoverable is-bordered">
      <thead>
        <tr>
          <th>Server</th>
          <th>Type</th>
          <th>Activator</th>
          <th>Message</th>
          <th>Target</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in data" :key="log.id">
          <td class="nowrap">{{ log.server }}</td>
          <td class="nowrap">{{ log.type }}</td>
          <td class="nowrap">
            <component :is="log.client.hasStats?'a':'span'" :href="getStatProfile(log.client.steamid)" :data-tooltip="log.client.steamid">
              {{ log.client.name }}
            </component>
          </td>
          <td>{{ log.message }}</td>
          <td class="nowrap">
            <component :is="log.target.hasStats?'a':'span'" :href="getStatProfile(log.target.steamid)" :data-tooltip="log.target.steamid">
              {{ log.target.name }}
            </component>
          </td>
          <td class="nowrap">{{ log.timestamp }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
</template>

<script>
const FULLNAME_REGEX = /"([^"\n<>]+)<\d+><(STEAM_\d:\d:\d+|Console)><(Console)?>"/g

export default {
  FILTERS: {
    servers: [
      "improved", "reserved", "public1", "public2", "public3", "public4"
    ],
    types: [ "ACTION", "CHAT", "QUIT", "JOIN", "BAN", "KICK" ],
  },
  data() {
    return {
      data: [],
      filters: {}
    }
  },
  computed: {
    query() {
      let query = ""
      for(const filter in this.filters) {
        if(this.filters[filter] && this.filters[filter].length > 0) {
          query += `&${filter}=${this.filters[filter].join(",")}`
        }
      }
      return query.length > 0 ? query : ""
    }
  },
  watch: {
    query() {
      this.getData()
    }
  },
  methods: {
    formatFilter(id) {
      return id[0].toUpperCase() + id.slice(1)
    },
    getData() {
      fetch(`//api.lgs.jackz.me/get-activity.php?v=1${this.query}`)
        .then(res => res.json())
        .then(json => {
          json.forEach(log => {
            log.timestamp = this.formatDate(log.timestamp)
            log.client = {
              steamid: log.client,
              name: log.clientName || log.client,
              hasStats: !!log.clientName,
            }
            log.target = {
              steamid: log.target,
              name: log.targetName || log.target,
              hasStats: !!log.targetName,
            }
            if(log.message) {
              const msg = [...log.message.matchAll(FULLNAME_REGEX)]
              if(msg && msg.length > 0) {
                console.log(msg)
                if(msg[0] && log.client.steamid !== "Server") log.client.name = msg[0][1]
                if(msg[1] && log.target.steamid !== "Server") log.target.name = msg[1][1]
                log.message = log.message.replace(FULLNAME_REGEX, '')
              }
            }
          })
          this.data = json
        })
    },
    formatDate(timestamp) {
      const d = new Date(timestamp * 1000)
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    getStatProfile(id) {
      return `https://stats.jackz.me/user/${id}/overview`
    }
  },
  created() {
    for(const filter in this.$options.FILTERS) {
      this.$set(this.filters, filter, [])
    }
    this.getData()
  }
}
</script>

<style>
.nowrap {
  white-space:nowrap;
}
</style>
