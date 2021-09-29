<template>
<div>
  <div class="container">
    <div class="columns">
      <div class="column is-11">
        <p class="title is-3">Server Logs</p>
        <p class="subtitle is-6">
          {{count.toLocaleString()}} log entries
          <em v-if="query != ''">(filtered)</em>
        </p>
      </div>
      <div class="column">
        <button @click="getData" :disabled="loading" :class="['button','is-info',{'is-loading':loading}]">Refresh</button>
      </div>
    </div>
    <br>
    <div class="columns">
      <div class="column is-narrow" v-for="(list, filter) in $options.FILTERS" :key="filter">
        <label class="label">{{ formatFilter(filter) }}</label>
        <div class="select is-multiple">
          <select multiple v-model="filters[filter]">
            <option v-for="entry in list" :key="entry" :value="entry">{{entry}}</option>
          </select>
          <a @click="filters[filter] = []">Clear</a>
          <a @click="filters[filter] = $options.FILTERS[filter]" class="is-pulled-right is-inline">Select All</a>
        </div>
      </div>
      <div class="column">
        <label class="label">Filter Activator</label>
        <div class="select">
          <select v-model="filters.client">
            <option :value="null">Any</option>
            <option v-for="user in history.activators" :key="user.steamid" :value="user.steamid">
              <template v-if="user.name">
                {{user.name}} ({{user.steamid}})
              </template>
              <template v-else>{{user.steamid}}</template>
            </option>
          </select>
        </div>

        <label class="label">Filter Target</label>
        <div class="select">
          <select v-model="filters.target">
            <option :value="null">Any</option>
            <option v-for="user in history.targets" :key="user.steamid" :value="user.steamid">
              <template v-if="user.name">
                {{user.name}} ({{user.steamid}})
              </template>
              <template v-else>{{user.steamid}}</template>
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
  <hr>
  <div class="container">
    <p v-if="loading" class="subtitle is-3 has-text-centered">Loading...</p>
    <Pagination v-else :page="page" :count="count" :limit="limit" @page="setPage" />
  </div>
  <br>
  <div class="container is-fluid" v-show="!loading">
    <table class="table is-fullwidth is-striped is-hoverable is-bordered">
      <thead>
        <tr>
          <th style="width:0" data-tooltip="The server the action was recorded on">Server</th>
          <th style="width:0" data-tooltip="The type of action that occurred">Type</th>
          <th style="width:0" data-tooltip="Who caused the action to occur. May not exist">Activator</th>
          <th>
            <div class="is-inline-block">
              <label class="label is-inline-block">Message</label>&nbsp;&nbsp;
              <input class="input is-inline is-small is-expanded" v-model="search.message" placeholder="Filter" />
            </div>
          </th>
          <th v-if="isTargetColumnVisible" style="width:0" data-tooltip="Who the action was against. May not exist">Target</th>
          <th style="width:0">Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in filteredData" :key="log.id">
          <td class="nowrap">
              <span v-if="log.server" :class="['tag', $options.SERVER_COLORS[log.server]]">{{ log.server }}</span>
          </td>
          <td class="nowrap">
            <span :class="['tag', $options.TYPE_COLORS[log.type]]">{{ log.type }}</span>
          </td>
          <td class="nowrap">
            <b>
            <component
              :is="log.client.hasStats?'a':'span'"
              @click="setUserFilter('client', log.client.steamid)"
              @click.ctrl="openStatsProfile(log.client.steamid)"
              :data-tooltip="log.client.steamid + '\n\nClick to only see entries from this user.\nCtrl + Click to view stats profile'"
            >
              {{ log.client.name }}
            </component>
            </b>
          </td>
          <td v-html="log.message"></td>
          <td class="nowrap" v-if="isTargetColumnVisible">
            <component :is="log.target.hasStats?'a':'span'" :href="getStatProfile(log.target.steamid)" :data-tooltip="log.target.steamid">
              {{ log.target.name }}
            </component>
          </td>
          <td class="nowrap">{{ log.timestamp }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <br>
  <div class="container" v-if="!loading">
    <Pagination :page="page" :count="count" :limit="limit" @page="setPage" />
  </div>
<br>
</div>
</template>

<script>
import Pagination from '@/components/pagination'
import Debounce from '@/js/debounce.js'

const FULLNAME_REGEX = /"([^"\n<>]+)<\d+><(STEAM_\d:\d:\d+|Console)><(Console)?>"/g
const ADMINCHAT_REGEX = /triggered sm_say \(text (.*)\)/

export default {
  components: { Pagination },
  FILTERS: {
    servers: [
      "improved", "reserved", "public1", "public2", "public3", "public4"
    ],
    types: [ "ACTION", "CHAT", "INFO", "STATE", "QUIT", "JOIN" ],
  },
  TYPE_COLORS: {
    ACTION: "is-info",
    CHAT: "is-secondary",
    STATE: "is-primary",
    QUIT: "is-danger",
    JOIN: "is-success",
    INFO: "is-link"
  },
  SERVER_COLORS: {
    improved: "is-success",
    reserved: "is-dark",
  },
  data() {
    return {
      loading: true,
      data: [],
      count: 0,
      filters: {
        servers: ["improved", "reserved"],
        types: ["ACTION", "CHAT", "INFO", "STATE"],
        client: null,
        target: null
      },
      search: {
        message: null,
      },
      history: {
        activators: [],
        targets: [],
      },
      page: 1,
      limit: 20,
      fetchDebounce: null
    }
  },
  computed: {
    filteredData() {
      if(!this.search.message) return this.data
      return this.data.filter(log => log.message.includes(this.search.message))
    },
    query() {
      //todo: search
      let query = ""
      for(const filter in this.filters) {
        if(this.filters[filter]) {
          if(Array.isArray(this.filters[filter])) {
            if(this.filters[filter].length > 0 )
              query += `&${filter}=${this.filters[filter].join(",")}`
          } else {
            query += `&${filter}=${this.filters[filter]}`
          }
        }
      }
      for(const search in this.search) {
        if(this.search[search]) {
          query += `&search_${search}=${this.search[search]}`
        }
      }
      return query.length > 0 ? query : ""
    },
    isTargetColumnVisible() {
      for(const data in this.data) {
        if(this.data[data]['target']['steamid']) return true
      }
      return false
    }
  },
  watch: {
    query() {
      this.page = 1
      this.fetchDebounce()
    }
  },
  methods: {
    formatFilter(id) {
      return id[0].toUpperCase() + id.slice(1)
    },
    setPage(page) {
      this.page = page
      this.getData()
    },
    setUserFilter(type, id) {
      this.filters[type] = id
    },
    openStatsProfile(id) {
      window.open(`https://stats.jackz.me/user/${id}/overview`)
    },
    getData() {
      fetch(`//api.lgs.jackz.me/get-activity.php?page=${this.page}&limit=${this.limit}${this.query}`)
        .then(res => res.json())
        .then(json => {
          this.loading = false
          this.count = json.count
          json.logs.forEach(log => {
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

            if(log.client.steamid && !this.history.activators.some(c => c.steamid == log.client.steamid)) this.history.activators.push(log.client)
            if(log.target.steamid && !this.history.targets.some(c => c.steamid == log.target.steamid)) this.history.targets.push(log.target)

            if(log.message) {
              // const msg = [...log.message.matchAll(FULLNAME_REGEX)]
              // if(msg && msg.length > 0) {
              //   if(msg[0] && log.client.steamid !== "Server") log.client.name = msg[0][1]
              //   if(msg[1] && log.target.steamid !== "Server") log.target.name = msg[1][1]
              //   // log.message = log.message.replace(FULLNAME_REGEX, '')
              // }
              log.message = log.message.replace(FULLNAME_REGEX, '')
              const adminChatMatch = log.message.match(ADMINCHAT_REGEX)
              if(adminChatMatch) {
                log.message = `<span class='tag is-warning' data-tooltip='Message was sent in admin chat'>${adminChatMatch[1]}</span>`
                log.type = "CHAT"
              }
            }
          })
          this.data = json.logs
          window.localStorage.setItem('l4d2admin_data', JSON.stringify({
            history: this.history
          }))
        })
    },
    formatDate(timestamp) {
      const d = new Date(timestamp * 1000)
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
    },
    getStatProfile(id) {
      return `https://stats.jackz.me/user/${id}/overview`
    }
  },
  created() {
    if(window.localStorage['l4d2admin_data']) {
      this.history = JSON.parse(window.localStorage['l4d2admin_data']).history
    }

    this.fetchDebounce = Debounce(this.getData, 500)
    for(const filter in this.$options.FILTERS) {
      if(!this.filters[filter])
        this.$set(this.filters, filter, [])
    }
    this.getData()
    setInterval(() => this.getData(), 1000 * 60 * 2)
  },
}

</script>

<style>
.nowrap {
  white-space:nowrap;
}
</style>
